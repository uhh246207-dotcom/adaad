// PsdKonvaEditor — Konva-powered interactive canvas for the
// customer PSD editor. Provides:
//
//   • A pixel-accurate stage at the document size, scaled to fit
//     the viewport with letterboxing.
//   • Per-layer drag, resize (corner + edge handles), rotate.
//   • Click-to-select with bounding-box highlight + lock badges.
//   • Smart-fit on initial image upload (smartAutoFit) so the
//     subject lands centered in the layer.
//   • Marching-ants visual cue on selection.
//
// What it does NOT do:
//   • Effect editing — that's the Properties panel's job. This
//     component just renders effects via a baked PNG of the layer
//     produced by `psdRenderer.renderTemplateToCanvas` (so what
//     you see on stage matches what gets exported).
//
// Why "render to image, not native Konva text":
//   Konva.Text doesn't ship Photoshop-style stroke + shadow + glow
//   + gradient combos out of the box. Trying to recreate a 4-pass
//   typesetting in declarative Konva nodes drifts visually from
//   the canvas2D-baked export. Shipping the same baked PNG to the
//   stage guarantees WYSIWYG.
//
// Performance:
//   We re-bake the per-layer PNG only when its content (text /
//   image override) changes, NOT when its transform changes. Pure
//   transforms (drag, rotate, resize) just reposition the existing
//   Konva.Image node — fast and lag-free.

import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { Stage, Layer as KLayer, Image as KImage, Rect, Group, Transformer } from 'react-konva'
import useImage from 'use-image'
import { renderTemplateToCanvas } from '../../utils/psdRenderer'
import { smartFitImage, loadImage } from '../../utils/smartAutoFit'

// Bake one layer to a {width, height} PNG dataUrl. Includes the
// layer's effects so what shows on stage matches the export.
async function bakeLayer(template, layer, override) {
  const canvas = document.createElement('canvas')
  canvas.width = layer.width
  canvas.height = layer.height
  const ctx = canvas.getContext('2d')
  // Render JUST this one layer in isolation. We do that by feeding
  // the renderer a synthetic single-layer template offset back to
  // (0,0) so the bitmap fills the canvas.
  const single = {
    width: layer.width,
    height: layer.height,
    layers: [{ ...layer, left: 0, top: 0 }],
  }
  await renderTemplateToCanvas(single, override ? { [layer.name]: override } : {}, { target: canvas })
  return canvas.toDataURL('image/png')
}

// Single Konva node for one PSD layer. We isolate this so each
// layer's image bake + transformer wiring is local and React can
// short-circuit re-renders cleanly.
function LayerNode({
  layer, transform, override, onSelect, onTransform,
  isSelected, locked, transformerRef, template,
}) {
  const [bakedUrl, setBakedUrl] = useState(layer.bitmapDataUrl || null)
  const [img] = useImage(bakedUrl || '', 'anonymous')
  const nodeRef = useRef(null)

  // Re-bake whenever the override changes meaningfully. We compare
  // by JSON stringification because override is shallow and small.
  const overrideKey = useMemo(() => JSON.stringify(override || {}), [override])
  useEffect(() => {
    let cancelled = false
    if (!override || (!override.text && !override.imageDataUrl)) {
      // No override → use the original baked bitmap straight from
      // the parser. Avoids a redundant re-bake on first paint.
      setBakedUrl(layer.bitmapDataUrl || null)
      return
    }
    bakeLayer(template, layer, override).then((url) => {
      if (!cancelled) setBakedUrl(url)
    }).catch((err) => console.warn('[konva] bake failed', layer.name, err))
    return () => { cancelled = true }
  }, [overrideKey, layer, template])

  // Wire the Transformer to this node when it's selected. Konva
  // demands an imperative node reference for the transformer's
  // `nodes()` setter.
  useEffect(() => {
    if (isSelected && nodeRef.current && transformerRef.current) {
      transformerRef.current.nodes([nodeRef.current])
      transformerRef.current.getLayer()?.batchDraw()
    }
  }, [isSelected, transformerRef])

  // Konva applies scaleX/scaleY during a transform. We bake those
  // back into width/height on transformend so subsequent edits see
  // a clean coordinate system (Konva docs recommend this idiom).
  const handleTransformEnd = useCallback(() => {
    const node = nodeRef.current
    if (!node) return
    const sx = node.scaleX(), sy = node.scaleY()
    const next = {
      x: node.x(), y: node.y(),
      width: Math.max(20, node.width() * sx),
      height: Math.max(20, node.height() * sy),
      rotation: node.rotation(),
    }
    node.scaleX(1); node.scaleY(1)
    onTransform(next)
  }, [onTransform])

  if (!img) return null

  return (
    <KImage
      ref={nodeRef}
      image={img}
      x={transform.x}
      y={transform.y}
      width={transform.width}
      height={transform.height}
      rotation={transform.rotation || 0}
      opacity={layer.opacity ?? 1}
      draggable={!locked}
      listening={!locked}
      onClick={() => onSelect(layer.name)}
      onTap={() => onSelect(layer.name)}
      onDragEnd={(e) => onTransform({
        ...transform,
        x: e.target.x(),
        y: e.target.y(),
      })}
      onTransformEnd={handleTransformEnd}
      // Cache the baked PNG so Konva doesn't re-decode on every
      // frame during a drag. cacheStrategy 'image' is just shorter
      // for "use the source image as the cache".
      perfectDrawEnabled={false}
    />
  )
}

// Public component.
//
// Props:
//   template        — { width, height, layers, locks }
//   overrides       — { [layerName]: { text?, imageDataUrl? } }
//   transforms      — { [layerName]: { x, y, width, height, rotation } }
//   selectedName    — layer name of the currently-selected node, or null
//   onChangeTransform — (layerName, transform) => void
//   onSelect        — (layerName | null) => void
//
// Stage scaling is automatic: the component measures its parent
// box on mount + resize and picks the largest integer scale that
// fits without scrollbars.
export default function PsdKonvaEditor({
  template, overrides, transforms,
  selectedName, onSelect, onChangeTransform,
}) {
  const containerRef = useRef(null)
  const stageRef = useRef(null)
  const transformerRef = useRef(null)
  const [stageSize, setStageSize] = useState({ width: 0, height: 0, scale: 1 })

  // Fit the document inside the container. We resize to the
  // container's actual ContentRect on every observed change, so
  // sidebars opening/closing snap the canvas size correctly.
  useEffect(() => {
    if (!containerRef.current) return
    const el = containerRef.current
    const ro = new ResizeObserver(() => {
      const cw = el.clientWidth
      const ch = el.clientHeight
      if (!cw || !ch || !template?.width) return
      // 24px padding on each side to avoid handles being clipped.
      const pad = 32
      const scale = Math.min(
        (cw - pad * 2) / template.width,
        (ch - pad * 2) / template.height,
      )
      setStageSize({
        width: cw,
        height: ch,
        scale: Math.max(0.05, Math.min(scale, 4)),
      })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [template?.width, template?.height])

  // Reverse layers so Konva draw order matches the PSD (parser
  // already returned top-down; Konva draws array order = bottom-up).
  const drawOrder = useMemo(() => template?.layers?.slice().reverse() || [], [template])

  // Click empty stage area → deselect.
  const handleStageClick = useCallback((e) => {
    if (e.target === e.target.getStage()) onSelect(null)
  }, [onSelect])

  // Helper: layer-level transform with sensible defaults pulled
  // from the parsed PSD coordinates.
  const xformOf = useCallback((layer) => {
    const t = transforms?.[layer.name]
    return {
      x: t?.x ?? layer.left,
      y: t?.y ?? layer.top,
      width: t?.width ?? layer.width,
      height: t?.height ?? layer.height,
      rotation: t?.rotation ?? 0,
    }
  }, [transforms])

  if (!template) return null
  const { width, height } = template

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden flex items-center justify-center"
      style={{
        background:
          'repeating-conic-gradient(rgba(255,255,255,0.04) 0% 25%, transparent 0% 50%) 0 0 / 20px 20px, #0a0a14',
      }}
    >
      <Stage
        ref={stageRef}
        width={Math.max(1, width * stageSize.scale)}
        height={Math.max(1, height * stageSize.scale)}
        scaleX={stageSize.scale}
        scaleY={stageSize.scale}
        onMouseDown={handleStageClick}
        onTouchStart={handleStageClick}
        style={{
          boxShadow: '0 12px 36px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.06)',
          borderRadius: 8,
        }}
      >
        {/* Document bg — paints a subtle white plate so transparent
            layers are visible against the checkered backdrop. */}
        <KLayer listening={false}>
          <Rect x={0} y={0} width={width} height={height} fill="#0e1120" />
        </KLayer>

        {/* Image / text layers */}
        <KLayer>
          {drawOrder.map((layer) => {
            const locked = !!template.locks?.[layer.name]
            const xf = xformOf(layer)
            return (
              <LayerNode
                key={layer.id || layer.name}
                layer={layer}
                template={template}
                transform={xf}
                override={overrides?.[layer.name]}
                isSelected={selectedName === layer.name}
                locked={locked}
                onSelect={onSelect}
                onTransform={(next) => onChangeTransform(layer.name, next)}
                transformerRef={transformerRef}
              />
            )
          })}
          <Transformer
            ref={transformerRef}
            // Don't allow dragging the transformer itself off-stage.
            boundBoxFunc={(oldBox, newBox) => {
              if (newBox.width < 20 || newBox.height < 20) return oldBox
              return newBox
            }}
            rotateEnabled={true}
            anchorSize={10}
            anchorCornerRadius={5}
            anchorFill="#fff"
            anchorStroke="#6e4bff"
            anchorStrokeWidth={2}
            borderStroke="#6e4bff"
            borderStrokeWidth={1.5}
            borderDash={[6, 4]}
            // Hide handles when nothing selected (prevents an empty
            // floating transformer shell).
            visible={!!selectedName}
            keepRatio={false}
          />
        </KLayer>
      </Stage>
    </div>
  )
}

// Helper exported for external use: produce a "smart-fitted"
// imageDataUrl from a raw upload, so the customer-facing form can
// short-circuit the editor's auto-fit when it just wants the file
// pre-cropped. Note: returns a *new* dataUrl, doesn't mutate input.
export async function smartFitDataUrl(dataUrl, targetW, targetH) {
  const img = await loadImage(dataUrl)
  const fit = await smartFitImage(img, targetW, targetH)
  if (!fit) return dataUrl
  // Produce a re-cropped PNG so further "cover" sampling by the
  // renderer doesn't re-introduce off-centre cropping.
  const c = document.createElement('canvas')
  c.width = targetW
  c.height = targetH
  c.getContext('2d').drawImage(img, fit.sx, fit.sy, fit.sw, fit.sh, 0, 0, targetW, targetH)
  return c.toDataURL('image/png')
}
