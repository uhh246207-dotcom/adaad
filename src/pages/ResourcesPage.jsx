import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FolderOpen, Download, Heart, Eye, Filter, Grid3X3, List, Star, ExternalLink, Image, FileType, Box, Cpu, Layers, Search, MousePointer2, Sparkles } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import GuideSection from '../components/ui/GuideSection'

const CATEGORIES = [
  { value: 'all',      label: 'Tất cả',  icon: Grid3X3 },
  { value: 'image',    label: 'Ảnh',     icon: Image },
  { value: 'psd',      label: 'PSD',     icon: Layers },
  { value: 'icon',     label: 'Icon',    icon: Star },
  { value: 'mockup',   label: 'Mockup',  icon: Box },
  { value: 'ai',       label: 'AI Asset',icon: Cpu },
]

const RESOURCES = [
  { id:'r-01', title:'Neon Gradient Pack', category:'image', tags:['gradient','neon','background'], downloads:2341, likes:456, size:'45 MB', format:'PNG', rating:4.9, preview:'linear-gradient(135deg,#ff2e63,#7c5cff,#08d9d6)', free:true },
  { id:'r-02', title:'Glassmorphism UI Kit', category:'psd', tags:['glass','ui','template'], downloads:1892, likes:389, size:'120 MB', format:'PSD', rating:4.8, preview:'linear-gradient(135deg,rgba(110,75,255,0.3),rgba(77,208,255,0.2))', free:false },
  { id:'r-03', title:'Icon Set Premium 500+', category:'icon', tags:['icon','svg','line'], downloads:5670, likes:1234, size:'8 MB', format:'SVG', rating:5.0, preview:'linear-gradient(135deg,#2bf2c0,#4dd0ff)', free:true },
  { id:'r-04', title:'iPhone 15 Mockup Pack', category:'mockup', tags:['iphone','mockup','device'], downloads:3421, likes:678, size:'200 MB', format:'PSD', rating:4.9, preview:'linear-gradient(135deg,#1a1a2e,#4dd0ff)', free:false },
  { id:'r-05', title:'AI Prompt Templates', category:'ai', tags:['prompt','midjourney','ai'], downloads:7823, likes:2100, size:'2 MB', format:'TXT', rating:4.7, preview:'linear-gradient(135deg,#7c5cff,#ff5edb)', free:true },
  { id:'r-06', title:'Cyberpunk Texture Pack', category:'image', tags:['texture','cyberpunk','dark'], downloads:1234, likes:290, size:'85 MB', format:'JPG', rating:4.6, preview:'linear-gradient(135deg,#ff2e63,#1a1a2e)', free:false },
  { id:'r-07', title:'Social Media Templates', category:'psd', tags:['social','template','post'], downloads:4567, likes:890, size:'350 MB', format:'PSD', rating:4.8, preview:'linear-gradient(135deg,#ff5edb,#7c5cff)', free:false },
  { id:'r-08', title:'3D Element Pack', category:'mockup', tags:['3d','element','object'], downloads:2890, likes:567, size:'180 MB', format:'PNG', rating:4.9, preview:'linear-gradient(135deg,#2bf2c0,#7c5cff)', free:true },
  { id:'r-09', title:'AI Portrait Styles', category:'ai', tags:['portrait','ai','style'], downloads:9123, likes:3400, size:'5 MB', format:'JSON', rating:4.8, preview:'linear-gradient(135deg,#4dd0ff,#ff5edb)', free:true, hot:true },
  { id:'r-10', title:'Minimal Icon Set', category:'icon', tags:['minimal','icon','outline'], downloads:3456, likes:678, size:'4 MB', format:'SVG', rating:4.7, preview:'linear-gradient(135deg,#ffd166,#ff5e62)', free:true },
  { id:'r-11', title:'Brand Guidelines Kit', category:'psd', tags:['brand','guidelines','identity'], downloads:1789, likes:345, size:'90 MB', format:'PSD', rating:4.9, preview:'linear-gradient(135deg,#0f2027,#00d9f5)', free:false },
  { id:'r-12', title:'Futuristic Backgrounds', category:'image', tags:['background','futuristic','ai'], downloads:6712, likes:1456, size:'120 MB', format:'JPG', rating:4.8, preview:'linear-gradient(135deg,#1a1a2e,#7c5cff,#00d9f5)', free:true, hot:true },
]

const FORMAT_COLORS = {
  PNG:  'bg-emerald-500/20 text-emerald-400',
  PSD:  'bg-blue-500/20 text-blue-400',
  SVG:  'bg-orange-500/20 text-orange-400',
  JPG:  'bg-pink-500/20 text-pink-400',
  TXT:  'bg-cyan-500/20 text-cyan-400',
  JSON: 'bg-yellow-500/20 text-yellow-400',
}

function ResourceCard({ item, viewMode, onDownload, onPreview }) {
  const [liked, setLiked] = useState(false)

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ y: viewMode === 'grid' ? -4 : 0 }}
      className={`glass-card overflow-hidden group ${viewMode === 'list' ? 'flex items-center gap-4 p-4' : ''}`}>

      {/* Preview */}
      <div className={`relative overflow-hidden flex-shrink-0 ${viewMode === 'grid' ? 'h-36' : 'w-20 h-16 rounded-xl'}`}
        style={{ background: item.preview }}>
        <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-black/20" />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-3xl opacity-50">
            {item.category === 'image' ? '🖼' : item.category === 'psd' ? '📄' :
             item.category === 'icon' ? '✦' : item.category === 'mockup' ? '📱' : '🤖'}
          </span>
        </div>
        {item.hot && viewMode === 'grid' && (
          <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-500 text-white">HOT</div>
        )}
        <div className={`absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center gap-2`}>
          <button onClick={() => onPreview(item)}
            className="p-2 rounded-xl bg-white/15 backdrop-blur-sm border border-white/20 text-white hover:bg-white/25 transition-all">
            <Eye size={14} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className={viewMode === 'grid' ? 'p-4' : 'flex-1 min-w-0'}>
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="min-w-0">
            <h3 className={`font-semibold text-white truncate ${viewMode === 'list' ? 'text-sm' : 'text-sm'}`}>{item.title}</h3>
            {viewMode === 'list' && (
              <div className="flex items-center gap-2 mt-1">
                {item.tags.slice(0, 2).map(t => (
                  <span key={t} className="text-[10px] text-white/30">#{t}</span>
                ))}
              </div>
            )}
          </div>
          <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold flex-shrink-0 ${FORMAT_COLORS[item.format] || 'bg-white/10 text-white/50'}`}>
            {item.format}
          </span>
        </div>

        {viewMode === 'grid' && (
          <div className="flex flex-wrap gap-1 mb-3">
            {item.tags.slice(0, 3).map(t => (
              <span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-white/[0.04] text-white/30">#{t}</span>
            ))}
          </div>
        )}

        <div className={`flex items-center ${viewMode === 'list' ? 'gap-4 mt-2' : 'justify-between mt-3 pt-3 border-t border-white/[0.05]'}`}>
          <div className="flex items-center gap-3 text-[11px] text-white/35">
            <span className="flex items-center gap-1"><Download size={10} /> {item.downloads.toLocaleString()}</span>
            <span className="flex items-center gap-1"><Star size={10} className="text-yellow-400" /> {item.rating}</span>
            <span>{item.size}</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setLiked(!liked)}
              className={`p-1.5 rounded-lg transition-all ${liked ? 'text-rose-400 bg-rose-400/10' : 'text-white/30 hover:text-rose-400 hover:bg-rose-400/10'}`}>
              <Heart size={13} fill={liked ? 'currentColor' : 'none'} />
            </button>
            <button onClick={() => onDownload(item)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all
                ${item.free ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30' : 'glass text-white/60 hover:text-white'}`}>
              {item.free ? <><Download size={11} /> Tải miễn phí</> : <><ExternalLink size={11} /> Mở khóa</>}
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

export default function ResourcesPage() {
  const [cat, setCat] = useState('all')
  const [viewMode, setViewMode] = useState('grid')
  const [sort, setSort] = useState('popular')
  const { toast } = useAppStore()

  const filtered = useMemo(() => {
    let list = RESOURCES.filter(r => {
      if (cat !== 'all' && r.category !== cat) return false
      return true
    })
    if (sort === 'popular') list = [...list].sort((a, b) => b.downloads - a.downloads)
    if (sort === 'newest') list = [...list].sort((a, b) => b.id.localeCompare(a.id))
    if (sort === 'rating') list = [...list].sort((a, b) => b.rating - a.rating)
    return list
  }, [cat, sort])

  const handleDownload = (item) => {
    if (item.free) {
      toast(`Đang tải "${item.title}"...`, 'success', 'Tải xuống')
    } else {
      toast('Tài nguyên này cần mở khóa Premium', 'warn', 'Cần nâng cấp')
    }
  }

  const handlePreview = (item) => {
    toast(`Xem trước: ${item.title}`, 'info', 'Preview')
  }

  const stats = [
    { label: 'Tài nguyên', value: '10,000+' },
    { label: 'Tải xuống', value: '2.4M+' },
    { label: 'Cộng đồng', value: '50K+' },
    { label: 'Cập nhật/tuần', value: '200+' },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2 mb-6">
        <div className="inline-flex items-center gap-2 badge mb-2">
          <FolderOpen size={13} /> Thư viện
        </div>
        <h1 className="font-display text-3xl font-bold text-white">
          Kho <span className="grad">tài nguyên</span>
        </h1>
        <p className="text-white/40 text-sm">Hàng nghìn ảnh, PSD, icon, mockup và AI asset miễn phí</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {stats.map(s => (
          <div key={s.label} className="glass-card p-3 text-center">
            <p className="font-display text-xl font-bold grad">{s.value}</p>
            <p className="text-xs text-white/40 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Guide */}
      <GuideSection
        title="Hướng dẫn sử dụng kho tài nguyên"
        subtitle="Tìm, lọc và tải tài nguyên miễn phí cho dự án thiết kế của bạn"
        accent="emerald"
        icon={FolderOpen}
        badgeText="3 bước"
        steps={[
          { icon: Filter,        title: 'Lọc theo danh mục', desc: 'Chọn loại tài nguyên: Ảnh, PSD, Icon, Mockup, AI Asset.', tip: 'Có thể đổi sang chế độ List để xem chi tiết file size.' },
          { icon: Search,        title: 'Tìm & sắp xếp',     desc: 'Sắp xếp theo phổ biến, mới nhất hoặc đánh giá cao.', tip: 'Click ❤ để lưu vào danh sách yêu thích.' },
          { icon: Download,      title: 'Tải miễn phí',      desc: 'Bấm "Tải miễn phí" với các asset gắn nhãn FREE.', tip: 'Asset Premium cần mở khóa bằng coin trong cửa hàng.' },
        ]}
        tips={[
          'Hơn 10,000+ tài nguyên cập nhật liên tục — quay lại thường xuyên để không bỏ lỡ.',
          'Định dạng đa dạng: PNG, PSD, SVG, JPG, JSON — phù hợp mọi quy trình thiết kế.',
          'Asset có nhãn HOT là những tài nguyên đang được tải nhiều nhất tuần.',
        ]}
      />

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">

        <div className="flex items-center gap-2 flex-wrap">
          <select value={sort} onChange={e => setSort(e.target.value)}
            className="px-3 py-2 rounded-xl text-sm text-white/70 outline-none cursor-pointer"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <option value="popular">Phổ biến nhất</option>
            <option value="newest">Mới nhất</option>
            <option value="rating">Đánh giá cao</option>
          </select>

          <div className="flex items-center gap-1 glass rounded-xl p-1">
            <button onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-brand-500/30 text-brand-300' : 'text-white/30 hover:text-white/60'}`}>
              <Grid3X3 size={15} />
            </button>
            <button onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-brand-500/30 text-brand-300' : 'text-white/30 hover:text-white/60'}`}>
              <List size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* Category tabs */}
      <div className="flex gap-2 flex-wrap">
        {CATEGORIES.map(({ value, label, icon: Icon }) => (
          <button key={value} onClick={() => setCat(value)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium transition-all
              ${cat === value ? 'bg-brand-500 text-white shadow-glow-sm' : 'glass text-white/50 hover:text-white hover:bg-white/[0.06]'}`}>
            <Icon size={13} /> {label}
          </button>
        ))}
        <div className="ml-auto text-xs text-white/30 self-center">{filtered.length} tài nguyên</div>
      </div>

      {/* Results */}
      <AnimatePresence mode="popLayout">
        {filtered.length > 0 ? (
          <motion.div layout
            className={viewMode === 'grid'
              ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'
              : 'space-y-3'}>
            {filtered.map(item => (
              <ResourceCard key={item.id} item={item} viewMode={viewMode}
                onDownload={handleDownload} onPreview={handlePreview} />
            ))}
          </motion.div>
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="text-center py-20 text-white/30">
            <FolderOpen size={40} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">Không tìm thấy tài nguyên phù hợp</p>
            <button onClick={() => { setCat('all') }}
              className="mt-3 text-xs text-brand-400 hover:text-brand-300 transition-colors">
              Xóa bộ lọc
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
