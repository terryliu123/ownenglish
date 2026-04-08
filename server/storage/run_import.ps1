# 数字化教具导入脚本
# 在 PowerShell 中执行: .\run_import.ps1

$ErrorActionPreference = "Continue"
Write-Host "开始导入数字化教具..." -ForegroundColor Green

# 1. 创建目录结构
$categories = @('physics', 'chemistry', 'biology', 'earth_science', 'mathematics', 'general_science', 'other')
foreach ($cat in $categories) {
    $path = "teaching-aids/assets/$cat"
    if (!(Test-Path $path)) {
        New-Item -ItemType Directory -Path $path -Force | Out-Null
        Write-Host "创建目录: $path" -ForegroundColor Gray
    }
}

# 2. 读取CSV
$csv = Import-Csv "tm_gallery.csv" -Encoding UTF8
Write-Host "读取到 $($csv.Count) 条记录" -ForegroundColor Cyan

# 3. 分类函数
function Get-Category($title, $desc) {
    $text = ($title + $desc).ToLower()
    if ($text -match '电流|电压|电阻|电路|电子|电磁|滑轮|杠杆|摩擦|光学|透镜|望远镜|显微镜|色光|功|功率|热传递|发动机|航空|磁场|电荷|静电|导体|图斯|维维尼亚|电学') { return 'physics' }
    if ($text -match '化学|酸碱|中和|反应|溶解|蒸发|分子|原子|离子|元素|氧气|制氧|溶液|排气|集气|发生器|拉瓦锡') { return 'chemistry' }
    if ($text -match '生物|细胞|植物|动物|人体|种子|萌芽|生长|骨骼|肌肉|器官|遗传|dna|基因|进化|生态|食物链|病毒|膈肌') { return 'biology' }
    if ($text -match '地球|地理|地质|天文|宇宙|星球|行星|太阳|月球|自转|公转|节气|四季|经纬度|地形|火山|地震|星空') { return 'earth_science' }
    if ($text -match '数学|数独|华容道|计算|整数|小数|分数|坐标|函数|方程|不等式|几何|图形|三角形|圆|正方形|多边形|周长|面积|体积|勾股|正弦|余弦|正切|平移|旋转|概率|24点|拼图|五子棋|象棋') { return 'mathematics' }
    if ($text -match '二维码|计时器|流程图|提词器|汉字') { return 'general_science' }
    return 'other'
}

# 4. slug映射
$slugMap = @{
    '解释电流的形成' = 'current-formation'
    '电流形成原理' = 'current-principle'
    '植树问题' = 'tree-planting'
    '掷一掷' = 'dice-probability'
    '跑道长度差异可视化' = 'track-length-diff'
    '英语动物单词闪卡' = 'english-animal-flashcards'
    '智能教室分贝监测系统' = 'noise-monitor'
    '追及相遇问题互动游戏' = 'chase-meet-game'
    '摸球模拟器' = 'ball-simulator'
    '智能英文填字游戏生成器' = 'english-crossword'
    'AI骨骼识别' = 'ai-skeleton'
    '制作花钟（左侧鲜花，右侧钟表）' = 'flower-clock'
    '认知分类游戏(动物/水果/蔬菜)' = 'classification-game'
    '探索正方形中的小正方形' = 'square-explore'
    '地球的内核' = 'earth-core'
    '地球内核探究' = 'earth-core-explore'
    '课堂计时器' = 'classroom-timer'
    '计时器（小）' = 'timer-small'
    '教室分贝监测系统（新）' = 'noise-monitor-new'
    '数字华容道' = 'digital-klotski'
    '华容道' = 'klotski'
    '2、3、5的倍数特征练习' = 'multiple-235'
    '俄罗斯方块（新）' = 'tetris'
    '24点数字游戏' = '24-point-game'
    '数独' = 'sudoku'
    '分数学习互动' = 'fraction-learning'
    '单位换算挑战' = 'unit-conversion'
    '小小收银员' = 'cashier'
    '音乐协作' = 'music-collab'
    '滑动与滚动' = 'sliding-rolling'
    '手电筒的工作原理和构造' = 'flashlight'
    '火山构造教学演示' = 'volcano-structure'
    '八大行星排序' = 'planets-sorting'
    '探索两圆相交' = 'circles-intersection'
    '二十四节气流转图' = 'solar-terms'
    '探索酒精增发的快慢' = 'alcohol-evaporation'
    '潜望镜的原理' = 'periscope'
    '种子萌芽条件' = 'seed-germination'
    '探究溶解的快慢' = 'dissolution-speed'
    '定滑轮演示' = 'fixed-pulley'
    '动滑轮演示' = 'movable-pulley'
    '围长方形演示' = 'rectangle-demo'
    '探究摩擦力大小的影响因素' = 'friction-factors'
    '热传递的三种方式' = 'heat-transfer'
    '视觉暂留现象' = 'persistence-vision'
    '多力杠杆平衡演示' = 'lever-balance'
    '梁桥原理演示' = 'beam-bridge'
    '拱桥原理演示' = 'arch-bridge'
    '向上排气法' = 'upward-air'
    '钢架桥受力原理' = 'steel-bridge'
    '排水集气法' = 'water-displacement'
    '悬索桥受理原理' = 'suspension-bridge'
    '斜拉桥受力演示' = 'cable-bridge'
    '星舰起飞返回3D模拟' = 'starship-3d'
    '飞机起飞作用力模拟' = 'airplane-force'
    '工业制氧原理' = 'oxygen-production'
    '斜抛中的能量转化' = 'oblique-energy'
    '焦耳定律（电流热效应）实验' = 'joule-law'
    '四冲程汽油机工作原理演示' = 'engine-4stroke'
    '电铃工作原理演示' = 'electric-bell'
    '中和反应' = 'neutralization'
    '动能的影响因素' = 'kinetic-energy'
    '色光的混合' = 'color-mixing'
    '伽利略望远镜' = 'galileo-telescope'
    '模拟膈肌的运动' = 'diaphragm'
    '开普勒望远镜' = 'kepler-telescope'
    '光学显微镜成像原理' = 'microscope'
    '凸透镜成像' = 'convex-lens'
    '启普发生器' = 'kipp-generator'
    '向下排气法' = 'downward-air'
    '拉瓦锡实验' = 'lavoisier'
    '用拼图表达整式运算' = 'polynomial-puzzle'
    '月历中的数学' = 'calendar-math'
    '轴对称' = 'axial-symmetry'
    '中心对称' = 'central-symmetry'
    '坐标轴对称' = 'axis-symmetry'
    '坐标表示平移' = 'coordinate-translation'
    '正切' = 'tangent'
    '正弦和余弦' = 'sine-cosine'
    '作三角形的外接圆' = 'circumcircle'
    '作三角形的内切圆' = 'incircle'
    '图形的平移' = 'translation'
    '平行线被折线所截' = 'parallel-lines'
    '三角形的内切圆与外接圆' = 'incircle-circumcircle'
    '不等式的性质：用天平模拟不等关系' = 'inequality-balance'
    '三角形的分类：按边分' = 'triangle-classification'
    '两圆的位置关系与公切线' = 'circles-position'
    '三角形的高、中线与角平分线' = 'triangle-lines'
    '车轮中的数学道理' = 'wheel-math'
    '一次函数的应用：追及问题' = 'linear-chase'
    '一次函数的应用：相遇问题可视化' = 'linear-meeting'
    '双线段最值探究' = 'segment-extreme'
    '函数的应用：异速双动点 (面积问题)' = 'moving-points'
    '三角形中位线定理：旋转变换证明' = 'midline-theorem'
    '三角形的边角关系：大边对大角' = 'side-angle-relation'
    '生活中的几何体 (集装箱)' = 'container-geometry'
    '生活中的几何体 (金字塔)' = 'pyramid-geometry'
    '交通拥堵仿真系统' = 'traffic-sim'
    '仿真城市构建活动' = 'city-building'
    '非洲大草原' = 'african-savannah'
    '直列四缸引擎仿真' = 'engine-inline4'
    '城市电网构建' = 'power-grid'
    '自然、生命、科学炼金术' = 'science-alchemy'
    '拍立得照片墙' = 'polaroid-wall'
    '橡皮人混音器' = 'rubber-mixer'
    '摆姿势通关游戏' = 'pose-game'
    '汉字田字格带笔画' = 'chinese-grid'
    '广义相对论' = 'general-relativity'
    '航空发动机3D' = 'aircraft-engine'
    '电路原理交互演示' = 'circuit-demo'
    '垃圾分类小游戏' = 'garbage-sorting'
    '几何画板小工具' = 'geometry-sketchpad'
    '物质的变化：微观世界探索器' = 'matter-change'
    '摩斯密码模拟器' = 'morse-code'
    'Dinner Time' = 'dinner-time'
    'Happy Zoo' = 'happy-zoo'
    '安静养小树' = 'grow-tree'
    '气球与静电' = 'balloon-static'
    '快乐钢琴-创编乐园' = 'happy-piano'
    '架子鼓--创编乐园' = 'drum-kit'
    '大提琴' = 'cello'
    '卡宏鼓' = 'cajon'
    '微波原理：宏观与微观同步演示' = 'microwave'
    '流程图画板' = 'flowchart'
    'FPV模拟器' = 'fpv-sim'
    '简易版贾维斯效果' = 'jarvis-effect'
    '斯特鲁普效应测试' = 'stroop-test'
    '瞬时记忆矩阵 (The Memory Matrix)' = 'memory-matrix'
    '游戏名称：外星人猎手 (Alien Hunter)' = 'alien-hunter'
    '游戏名称：规则破壁者 (The Rule Breaker)' = 'rule-breaker'
    '游戏：Emoji 召唤师 (Mini Scribblenauts)' = 'emoji-summoner'
    'TPR（全身反应法）动作骰子' = 'tpr-dice'
    '火柴棍数学' = 'matchstick-math'
    '二维码生成器' = 'qr-generator'
    'AR-星空大师' = 'ar-starry-sky'
    '封面制作工坊' = 'cover-maker'
    '圣诞节快乐' = 'christmas'
    '华容道（新）' = 'klotski-new'
    '生态平衡模拟器' = 'ecology-balance'
    '角的度量演示器' = 'angle-measure'
    '长方形与正方形演示器' = 'rectangle-square'
    '提词器--专业版' = 'teleprompter'
    '钟琴' = 'glockenspiel'
    '三角铁' = 'triangle'
    '双响筒' = 'double-tone'
    '时钟教具' = 'clock-teaching'
    '英语单词连连看' = 'english-matching'
    '英文连连看-听力版' = 'english-matching-listen'
    '拼图游戏--触屏版' = 'puzzle-touch'
    '长方体滚动印图演示' = 'cuboid-rolling'
    '五子棋' = 'gomoku'
    '国际象棋' = 'chess'
    '中国象棋' = 'chinese-chess'
    '井字棋' = 'tic-tac-toe'
    '探究太阳能小车速度因素' = 'solar-car'
    '数学游园会' = 'math-carnival'
    '数字迷宫挑战' = 'number-maze'
    '数学游园' = 'math-garden'
    '埃舍尔密铺生成器--正方形' = 'escher-square'
    '埃舍尔密铺生成器--平行四边形' = 'escher-parallelogram'
    '埃舍尔密铺生成器--长方形' = 'escher-rectangle'
    '图斯双环定理 (Tusi Couple)' = 'tusi-couple'
    '维维尼亚定理' = 'viviani'
    '落花生' = 'peanuts'
}

function Get-Slug($title) {
    if ($slugMap.ContainsKey($title)) {
        return $slugMap[$title]
    }
    return ($title.ToLower() -replace ' ', '-' -replace '[（）()]', '').Substring(0, [Math]::Min(50, $title.Length))
}

# 5. 处理每个条目
$items = @()
$success = 0
$fail = 0

foreach ($row in $csv) {
    try {
        $title = $row.title
        $desc = $row.description
        $category = Get-Category $title $desc
        $slug = Get-Slug $title

        $htmlSrc = $row.gallery_url.Replace('/gallery/', '').Trim('/')
        if (!$htmlSrc.EndsWith('.html')) { $htmlSrc += '.html' }

        $thumbSrc = Split-Path $row.thumbnail -Leaf

        $destDir = "teaching-aids/assets/$category/$slug"

        # 创建目录
        New-Item -ItemType Directory -Path $destDir -Force | Out-Null

        # 复制HTML
        $srcHtml = "gallery/$htmlSrc"
        $destHtml = "$destDir/index.html"
        if (Test-Path $srcHtml) {
            Copy-Item $srcHtml $destHtml -Force
        } else {
            Write-Warning "HTML不存在: $srcHtml"
        }

        # 复制缩略图
        $srcThumb = "thumbnail/$thumbSrc"
        $destThumb = "$destDir/cover.png"
        if (Test-Path $srcThumb) {
            Copy-Item $srcThumb $destThumb -Force
        } else {
            Write-Warning "缩略图不存在: $srcThumb"
        }

        # 构建manifest条目
        $item = @{
            name = $title
            slug = $slug
            category = $category
            summary = if ($desc) { $desc.Substring(0, [Math]::Min(100, $desc.Length)) } else { $title }
            cover_image = "$category/$slug/cover.png"
            diagram_image = "$category/$slug/diagram.png"
            html_entry = "$category/$slug/index.html"
            source_filename = $htmlSrc
            tags = @($category)
        }
        $items += $item
        $success++
        Write-Host "[$category] $title -> $slug" -ForegroundColor Green
    }
    catch {
        $fail++
        Write-Error "处理失败: $title - $_"
    }
}

# 6. 生成Manifest
$manifest = @{
    schema_version = 1
    base_path = "server/storage/teaching-aids/assets"
    categories = @(
        @{ code = "physics"; label = "物理" }
        @{ code = "chemistry"; label = "化学" }
        @{ code = "biology"; label = "生物" }
        @{ code = "earth_science"; label = "地球科学" }
        @{ code = "mathematics"; label = "数学" }
        @{ code = "general_science"; label = "综合科学" }
        @{ code = "other"; label = "其他" }
    )
    items = $items
}

$manifest | ConvertTo-Json -Depth 10 | Out-File "teaching-aids/manifests/teaching-aids.json" -Encoding UTF8

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "导入完成!" -ForegroundColor Green
Write-Host "成功: $success, 失败: $fail" -ForegroundColor Yellow
Write-Host "Manifest: teaching-aids/manifests/teaching-aids.json" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
