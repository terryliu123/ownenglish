import csv
import json
import re
from collections import Counter

def classify_item(title, description):
    title_desc = (title + ' ' + description).lower()

    if any(k in title_desc for k in ['电流', '电压', '电阻', '电路', '电子', '电铃', '电磁', '焦耳', '动能', '能量', '滑轮', '杠杆', '摩擦力', '光学', '透镜', '望远镜', '显微镜', '色光', '斜面', '功', '功率', '热传递', '热传导', '热辐射', '对流', '发动机', '引擎', '航空', '力的', '牛顿', '运动', '速度', '磁场', '电荷', '静电', '导体', '图斯双环', '维维尼亚', '机械', '电学']):
        return 'physics'

    if any(k in title_desc for k in ['化学', '酸碱', '中和', '反应', '溶解', '蒸发', '挥发', '分子', '原子', '离子', '化合物', '元素', '氧气', '制氧', '气体', '溶液', '排气', '集气', '启普发生器', '拉瓦锡', '燃烧', '化学']):
        return 'chemistry'

    if any(k in title_desc for k in ['生物', '细胞', '植物', '动物', '人体', '种子', '萌芽', '发芽', '生长', '光合', '呼吸', '根', '茎', '叶', '花', '果实', '器官', '骨骼', '肌肉', '神经', '循环', '消化', '遗传', 'DNA', '基因', '进化', '生态', '食物链', '微生物', '细菌', '病毒', '免疫', '膈肌']):
        return 'biology'

    if any(k in title_desc for k in ['地球', '地理', '地质', '天文', '宇宙', '星球', '行星', '恒星', '太阳', '月亮', '月球', '自转', '公转', '节气', '四季', '昼夜', '经纬度', '地图', '地形', '火山', '地震', '板块', '岩石', '天气', '气候', '气温', '降水', '星空', '星座', '银河系', '太阳系', '八大行星', '黑洞']):
        return 'earth_science'

    if any(k in title_desc for k in ['数学', '数独', '华容道', '算术', '计算', '整数', '小数', '分数', '百分数', '负数', '数轴', '坐标', '函数', '方程', '不等式', '代数', '几何', '图形', '三角形', '圆形', '正方形', '长方形', '多边形', '周长', '面积', '体积', '勾股', '三角函数', '正弦', '余弦', '正切', '对称', '平移', '旋转', '统计', '概率', '平均数', '植树', '追及', '相遇', '行程', '24点', '拼图', '俄罗斯方块', '五子棋', '象棋', '围棋', '田字格', '时钟', '角度', '密铺']):
        return 'mathematics'

    if any(k in title_desc for k in ['二维码', '计时器', '定时器', '流程图', '思维导图', '提词器', '汉字', '笔画']):
        return 'general_science'

    return 'other'

def generate_slug(title):
    mapping = {
        '解释电流的形成': 'current-formation-explanation',
        '电流形成原理': 'current-formation-principle',
        '植树问题': 'tree-planting-problem',
        '掷一掷': 'dice-probability',
        '跑道长度差异可视化': 'track-length-difference',
        '英语动物单词闪卡': 'english-animal-flashcards',
        '智能教室分贝监测系统': 'classroom-noise-monitor',
        '追及相遇问题互动游戏': 'chase-meet-interactive',
        '摸球模拟器': 'ball-touch-simulator',
        '智能英文填字游戏生成器': 'english-crossword-generator',
        'AI骨骼识别': 'ai-skeleton-recognition',
        '制作花钟（左侧鲜花，右侧钟表）': 'flower-clock',
        '认知分类游戏(动物/水果/蔬菜)': 'cognitive-classification-game',
        '探索正方形中的小正方形': 'small-squares-in-square',
        '地球的内核': 'earth-inner-core',
        '地球内核探究': 'earth-core-exploration',
        '课堂计时器': 'classroom-timer',
        '计时器（小）': 'timer-small',
        '教室分贝监测系统（新）': 'classroom-noise-monitor-new',
        '数字华容道': 'digital-klotski',
        '华容道': 'klotski',
        '2、3、5的倍数特征练习': 'multiple-235-practice',
        '俄罗斯方块（新）': 'tetris-new',
        '24点数字游戏': '24-point-game',
        '数独': 'sudoku',
        '分数学习互动': 'fraction-learning',
        '单位换算挑战': 'unit-conversion-challenge',
        '小小收银员': 'little-cashier',
        '音乐协作': 'music-collaboration',
        '滑动与滚动': 'sliding-rolling',
        '手电筒的工作原理和构造': 'flashlight-principle',
        '火山构造教学演示': 'volcano-structure-demo',
        '八大行星排序': 'eight-planets-sorting',
        '探索两圆相交': 'two-circles-intersection',
        '二十四节气流转图': 'solar-terms-cycle',
        '探索酒精增发的快慢': 'alcohol-evaporation-speed',
        '潜望镜的原理': 'periscope-principle',
        '种子萌芽条件': 'seed-germination-conditions',
        '探究溶解的快慢': 'dissolution-speed-explore',
        '定滑轮演示': 'fixed-pulley-demo',
        '动滑轮演示': 'movable-pulley-demo',
        '围长方形演示': 'rectangle-perimeter-demo',
        '探究摩擦力大小的影响因素': 'friction-factors-explore',
        '热传递的三种方式': 'heat-transfer-three-ways',
        '视觉暂留现象': 'persistence-of-vision',
        '多力杠杆平衡演示': 'multi-force-lever-balance',
        '梁桥原理演示': 'beam-bridge-principle',
        '拱桥原理演示': 'arch-bridge-principle',
        '向上排气法': 'upward-air-discharge',
        '钢架桥受力原理': 'steel-bridge-force',
        '排水集气法': 'water-displacement-gas',
        '悬索桥受理原理': 'suspension-bridge-force',
        '斜拉桥受力演示': 'cable-stayed-bridge-force',
        '星舰起飞返回3D模拟': 'starship-launch-3d',
        '飞机起飞作用力模拟': 'airplane-takeoff-force',
        '工业制氧原理': 'oxygen-production-principle',
        '斜抛中的能量转化': 'oblique-throw-energy',
        '焦耳定律（电流热效应）实验': 'joule-law-experiment',
        '四冲程汽油机工作原理演示': 'four-stroke-engine',
        '电铃工作原理演示': 'electric-bell-principle',
        '中和反应': 'neutralization-reaction',
        '动能的影响因素': 'kinetic-energy-factors',
        '色光的混合': 'color-light-mixing',
        '伽利略望远镜': 'galileo-telescope',
        '模拟膈肌的运动': 'diaphragm-movement-simulation',
        '开普勒望远镜': 'kepler-telescope',
        '光学显微镜成像原理': 'microscope-imaging',
        '凸透镜成像': 'convex-lens-imaging',
        '启普发生器': 'kipp-generator',
        '向下排气法': 'downward-air-discharge',
        '拉瓦锡实验': 'lavoisier-experiment',
        '用拼图表达整式运算': 'puzzle-polynomial-operations',
        '月历中的数学': 'calendar-mathematics',
        '轴对称': 'axial-symmetry',
        '中心对称': 'central-symmetry',
        '坐标轴对称': 'coordinate-axis-symmetry',
        '坐标表示平移': 'coordinate-translation',
        '正切': 'tangent',
        '正弦和余弦': 'sine-cosine',
        '作三角形的外接圆': 'triangle-circumcircle-construction',
        '作三角形的内切圆': 'triangle-incircle-construction',
        '图形的平移': 'geometric-translation',
        '平行线被折线所截': 'parallel-lines-cut-by-broken-line',
        '三角形的内切圆与外接圆': 'triangle-incircle-circumcircle',
        '不等式的性质：用天平模拟不等关系': 'inequality-balance-simulation',
        '三角形的分类：按边分': 'triangle-classification-by-side',
        '两圆的位置关系与公切线': 'two-circles-position-tangent',
        '三角形的高、中线与角平分线': 'triangle-altitude-median-bisector',
        '车轮中的数学道理': 'wheel-mathematics',
        '一次函数的应用：追及问题': 'linear-function-chase',
        '一次函数的应用：相遇问题可视化': 'linear-function-meeting',
        '双线段最值探究': 'two-segment-extreme',
        '函数的应用：异速双动点 (面积问题)': 'different-speed-moving-points',
        '三角形中位线定理：旋转变换证明': 'triangle-midline-rotation-proof',
        '三角形的边角关系：大边对大角': 'triangle-side-angle-relation',
        '生活中的几何体 (集装箱)': 'geometric-solid-container',
        '生活中的几何体 (金字塔)': 'geometric-solid-pyramid',
        '交通拥堵仿真系统': 'traffic-congestion-simulation',
        '仿真城市构建活动': 'simulated-city-building',
        '非洲大草原': 'african-savannah',
        '直列四缸引擎仿真': 'inline-four-engine',
        '城市电网构建': 'city-power-grid',
        '自然、生命、科学炼金术': 'nature-life-science-alchemy',
        '拍立得照片墙': 'polaroid-photo-wall',
        '橡皮人混音器': 'rubber-man-mixer',
        '摆姿势通关游戏': 'pose-game',
        '汉字田字格带笔画': 'chinese-character-grid',
        '广义相对论': 'general-relativity',
        '航空发动机3D': 'aircraft-engine-3d',
        '电路原理交互演示': 'circuit-principle-interactive',
        '垃圾分类小游戏': 'garbage-sorting-game',
        '几何画板小工具': 'geometry-sketchpad',
        '物质的变化：微观世界探索器': 'matter-change-microscopic',
        '摩斯密码模拟器': 'morse-code-simulator',
        'Dinner Time': 'dinner-time',
        'Happy Zoo': 'happy-zoo',
        '安静养小树': 'grow-tree-quietly',
        '气球与静电': 'balloon-electrostatic',
        '快乐钢琴-创编乐园': 'happy-piano',
        '架子鼓--创编乐园': 'drum-kit',
        '大提琴': 'cello',
        '卡宏鼓': 'cajon',
        '微波原理：宏观与微观同步演示': 'microwave-principle',
        '流程图画板': 'flowchart-board',
        'FPV模拟器': 'fpv-simulator',
        '简易版贾维斯效果': 'jarvis-effect',
        '斯特鲁普效应测试': 'stroop-effect-test',
        '瞬时记忆矩阵 (The Memory Matrix)': 'memory-matrix',
        '游戏名称：外星人猎手 (Alien Hunter)': 'alien-hunter',
        '游戏名称：规则破壁者 (The Rule Breaker)': 'rule-breaker',
        '游戏：Emoji 召唤师 (Mini Scribblenauts)': 'emoji-summoner',
        'TPR（全身反应法）动作骰子': 'tpr-action-dice',
        '火柴棍数学': 'matchstick-math',
        '二维码生成器': 'qr-code-generator',
        'AR-星空大师': 'ar-starry-sky-master',
        '封面制作工坊': 'cover-maker',
        '圣诞节快乐': 'merry-christmas',
        '华容道（新）': 'klotski-new',
        '生态平衡模拟器': 'ecological-balance-simulator',
        '角的度量演示器': 'angle-measurement',
        '长方形与正方形演示器': 'rectangle-square-demo',
        '提词器--专业版': 'teleprompter-pro',
        '钟琴': 'glockenspiel',
        '三角铁': 'triangle-instrument',
        '双响筒': 'double-tone-tube',
        '时钟教具': 'clock-teaching-aid',
        '英语单词连连看': 'english-word-matching',
        '英文连连看-听力版': 'english-word-matching-listening',
        '拼图游戏--触屏版': 'puzzle-game-touch',
        '长方体滚动印图演示': 'cuboid-rolling-print',
        '五子棋': 'gomoku',
        '国际象棋': 'chess',
        '中国象棋': 'chinese-chess',
        '井字棋': 'tic-tac-toe',
        '探究太阳能小车速度因素': 'solar-car-speed-factors',
        '数学游园会': 'math-carnival',
        '数字迷宫挑战': 'number-maze-challenge',
        '数学游园': 'math-garden-party',
        '埃舍尔密铺生成器--正方形': 'escher-tessellation-square',
        '埃舍尔密铺生成器--平行四边形': 'escher-tessellation-parallelogram',
        '埃舍尔密铺生成器--长方形': 'escher-tessellation-rectangle',
        '图斯双环定理 (Tusi Couple)': 'tusi-couple-theorem',
        '维维尼亚定理': 'viviani-theorem',
        '落花生': 'peanuts'
    }

    if title in mapping:
        return mapping[title]

    # 默认处理
    slug = re.sub(r'[^\u4e00-\u9fa5a-zA-Z0-9\s]', '', title).lower().strip()
    slug = slug.replace(' ', '-')[:50]
    if not slug or slug == '-':
        slug = 'item-' + str(abs(hash(title)) % 10000)
    return slug

items = []
with open('tm_gallery.csv', 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    for row in reader:
        title = row['title']
        desc = row['description'] or ''
        gallery_url = row['gallery_url']
        thumbnail = row['thumbnail']

        category = classify_item(title, desc)
        slug = generate_slug(title)

        html_filename = gallery_url.replace('/gallery/', '').strip('/')
        if not html_filename.endswith('.html'):
            html_filename += '.html'

        thumb_filename = thumbnail.split('/')[-1]

        # 生成标签
        tags = []
        if category == 'physics':
            tags = ['物理', '实验']
        elif category == 'chemistry':
            tags = ['化学', '实验']
        elif category == 'biology':
            tags = ['生物', '自然']
        elif category == 'earth_science':
            tags = ['地理', '天文']
        elif category == 'mathematics':
            tags = ['数学', '思维']

        items.append({
            'name': title,
            'slug': slug,
            'category': category,
            'summary': desc[:100] if desc else title,
            'cover_image': f'{category}/{slug}/cover.png',
            'diagram_image': f'{category}/{slug}/diagram.png',
            'html_entry': f'{category}/{slug}/index.html',
            'source_filename': html_filename,
            'thumbnail_src': thumb_filename,
            'tags': tags
        })

cats = Counter(i['category'] for i in items)
print('分类统计：')
for cat, count in sorted(cats.items(), key=lambda x: -x[1]):
    print(f'  {cat}: {count}')
print(f'\n总计: {len(items)} 个教具')

# 保存中间文件
with open('teaching_aids_manifest.json', 'w', encoding='utf-8') as f:
    json.dump(items, f, ensure_ascii=False, indent=2)
print('已保存 teaching_aids_manifest.json')

# 生成最终的 teaching-aids.json
manifest = {
    "schema_version": 1,
    "base_path": "server/storage/teaching-aids/assets",
    "categories": [
        {"code": "physics", "label": "物理"},
        {"code": "chemistry", "label": "化学"},
        {"code": "biology", "label": "生物"},
        {"code": "earth_science", "label": "地球科学"},
        {"code": "mathematics", "label": "数学"},
        {"code": "general_science", "label": "综合科学"},
        {"code": "other", "label": "其他"}
    ],
    "items": [
        {
            "name": i['name'],
            "slug": i['slug'],
            "category": i['category'],
            "summary": i['summary'],
            "cover_image": i['cover_image'],
            "diagram_image": i['diagram_image'],
            "html_entry": i['html_entry'],
            "source_filename": i['source_filename'],
            "tags": i['tags']
        }
        for i in items
    ]
}

with open('teaching-aids.json', 'w', encoding='utf-8') as f:
    json.dump(manifest, f, ensure_ascii=False, indent=2)
print('已保存 teaching-aids.json')
