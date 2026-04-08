# 数字化教具导入完整操作手册

## 一、目录结构创建脚本

在 `server/storage/` 目录下执行以下PowerShell脚本创建文件夹：

```powershell
$categories = @('physics', 'chemistry', 'biology', 'earth_science', 'mathematics', 'general_science', 'other')
$basePath = 'teaching-aids/assets'

foreach ($cat in $categories) {
    New-Item -ItemType Directory -Path "$basePath/$cat" -Force
}
```

## 二、完整分类映射表（前100条示例）

| 原名 | 分类 | slug | 源HTML文件 | 源缩略图 |
|------|------|------|-----------|---------|
| 解释电流的形成 | physics | current-formation-explanation | JmIol5f9GIy36ZyF.html | 1747819665-thumbnail.png |
| 植树问题 | mathematics | tree-planting-problem | 植树问题.html | zswt.jpg |
| 掷一掷 | mathematics | dice-probability | zyz.html | zyz.jpg |
| 跑道长度差异可视化 | physics | track-length-difference | lSHrNuN3IkC0zH3P.html | 1747732907-thumbnail.png |
| 英语动物单词闪卡 | other | english-animal-flashcards | YGPDKfYxoeaFrLtY.html | 1747752921-thumbnail.png |
| 电流形成原理 | physics | current-formation-principle | nl9F7g1BKf6CgNKa.html | 1747993793-thumbnail.png |
| 图片拼图游戏 | mathematics | picture-puzzle-game | 7ZYGa2dbiHKGieiC.html | 1748264702-thumbnail.png |
| 智能教室分贝监测系统 | physics | classroom-noise-monitor | QEWdyjqZOfPh08IH.html | 1748266518-thumbnail.png |
| 追及相遇问题互动游戏 | physics | chase-meet-interactive | SMTHLVNCFqOyFUxP.html | 1748319626-thumbnail.png |
| 摸球模拟器 | mathematics | ball-touch-simulator | FbHhjixbZKQbLUa6.html | 1748327919-thumbnail.png |
| 智能英文填字游戏生成器 | other | english-crossword-generator | hwbOTPpsop2wQs6L.html | 1748333079-thumbnail.png |
| AI骨骼识别 | biology | ai-skeleton-recognition | wp1EewDZwBRTu3hZ.html | 1748600459-thumbnail.png |
| 制作花钟（左侧鲜花，右侧钟表） | chemistry | flower-clock | DrbrApJk2dMsoYgB.html | 1748957883-thumbnail.png |
| 认知分类游戏(动物/水果/蔬菜) | biology | cognitive-classification-game | prEbBCJLwE3BPJHQ.html | 1749520633-thumbnail.png |
| 探索正方形中的小正方形 | mathematics | small-squares-in-square | lWS3YzLitNyTRb7Z.html | 1749524577-thumbnail.png |
| 地球的内核 | biology | earth-inner-core | 52A98iiFw6jVQKm9.html | 1749541373-thumbnail.png |
| 地球内核探究 | biology | earth-core-exploration | jU1hrCnAg2w56edk.html | 1749542619-thumbnail.png |
| 课堂计时器 | general_science | classroom-timer | c6fyo1JYSTee10kL.html | 1758094156-thumbnail.png |
| 计时器（小） | general_science | timer-small | rLhaRTEevueNRFXn.html | 1758099362-thumbnail.png |
| 教室分贝监测系统（新） | physics | classroom-noise-monitor-new | Rin54LhldCjaKqNQ.html | 1760175871-thumbnail.png |
| 数字华容道 | mathematics | digital-klotski | uGmBF80dxlVVNKYu.html | 1760178456-thumbnail.png |
| 华容道 | mathematics | klotski | jerk1M305g3I35Bq.html | 1760180833-thumbnail.png |
| 2、3、5的倍数特征练习 | mathematics | multiple-235-practice | OkBEYZqD1Od5oPYY.html | 1760931085-thumbnail.png |
| 俄罗斯方块（新） | mathematics | tetris-new | 4WbUVZPyCcIZq5NJ.html | 1761039146-thumbnail.png |
| 24点数字游戏 | mathematics | 24-point-game | WPfooUg8k6WYtIqk.html | 1761044940-thumbnail.png |
| 数独 | mathematics | sudoku | cgAlTW9uRcf2CQ8k.html | 1761044566-thumbnail.png |
| 分数学习互动 | mathematics | fraction-learning | Sm0Ebrr3uGdgXO7c.html | 1761045318-thumbnail.png |
| 单位换算挑战 | mathematics | unit-conversion-challenge | shIROGspVxrBT2gA.html | 1761045630-thumbnail.png |
| 小小收银员 | mathematics | little-cashier | elWQlV0Im3prrwC8.html | 1761091797-thumbnail.png |
| 音乐协作 | other | music-collaboration | B9ZttLe8CqGkyC9x.html | 1761657392-thumbnail.png |
| 滑动与滚动 | physics | sliding-rolling | aE1Bz3DohBPahqQG.html | 1763517642-thumbnail.png |
| 手电筒的工作原理和构造 | physics | flashlight-principle | kJL6Grp73nTSfpUi.html | 1763517130-thumbnail.png |
| 火山构造教学演示 | earth_science | volcano-structure-demo | 6DCAnr5NhihhV3v5.html | 1763516978-thumbnail.png |
| 八大行星排序 | earth_science | eight-planets-sorting | sgIqUSWtkgLTMsNV.html | 1763516598-thumbnail.png |
| 探索两圆相交 | mathematics | two-circles-intersection | oWU7ZEcVUBHtYvpq.html | 1763516087-thumbnail.png |
| 二十四节气流转图 | earth_science | solar-terms-cycle | T7zsuB02fZL5TUfz.html | 1763515311-thumbnail.png |
| 探索酒精增发的快慢 | chemistry | alcohol-evaporation-speed | mvXERWwcfLVIpqHi.html | 1763518291-thumbnail.png |
| 潜望镜的原理 | physics | periscope-principle | 7wYLDc0z8jH5dORK.html | 1763519957-thumbnail.png |
| 种子萌芽条件 | chemistry | seed-germination-conditions | PzvKUs3V6v8c2eyB.html | 1763519663-thumbnail.png |
| 探究溶解的快慢 | chemistry | dissolution-speed-explore | mPjqFESIGEvWrV5X.html | 1763519025-thumbnail.png |
| 定滑轮演示 | physics | fixed-pulley-demo | oeAXVj6cfYVShNyp.html | 1763523213-thumbnail.png |
| 动滑轮演示 | physics | movable-pulley-demo | mWav7PXYyyoutpcc.html | 1763523055-thumbnail.png |
| 围长方形演示 | mathematics | rectangle-perimeter-demo | JZDX5JlaqJdwDNLY.html | 1763522827-thumbnail.png |
| 探究摩擦力大小的影响因素 | physics | friction-factors-explore | nYAerVcAwQ3zuXHu.html | 1763521894-thumbnail.png |
| 热传递的三种方式 | physics | heat-transfer-three-ways | Iu9l4duBG75SyyeM.html | 1763521081-thumbnail.png |
| 视觉暂留现象 | physics | persistence-of-vision | b25MAisB6gAywQGf.html | 1763520535-thumbnail.png |
| 多力杠杆平衡演示 | physics | multi-force-lever-balance | oHsLN0fDBCpFT8fM.html | 1763523699-thumbnail.png |
| 梁桥原理演示 | physics | beam-bridge-principle | U6DFGymlnLZ2p1uV.html | 1763523930-thumbnail.png |
| 拱桥原理演示 | physics | arch-bridge-principle | kMuYXPGVNv8ZdQ6T.html | 1763524531-thumbnail.png |
| 向上排气法 | chemistry | upward-air-discharge | 1uKFmi0odueUl2Li.html | 1763525552-thumbnail.png |
| 钢架桥受力原理 | physics | steel-bridge-force | p1VobZOSsM8TTCrb.html | 1763525149-thumbnail.png |
| 排水集气法 | chemistry | water-displacement-gas | xpTr8IDZbS44fx1Q.html | 1763524967-thumbnail.png |
| 悬索桥受理原理 | physics | suspension-bridge-force | c0a0PNOb7Yhpnj6Y.html | 1763524749-thumbnail.png |
| 斜拉桥受力演示 | physics | cable-stayed-bridge-force | WHrdeHnvAoCwNl6J.html | 1763525990-thumbnail.png |
| 星舰起飞返回3D模拟 | physics | starship-launch-3d | 44hGwG33lcSRkMWz.html | 1763529216-thumbnail.png |
| 飞机起飞作用力模拟 | physics | airplane-takeoff-force | s5WRKrrrGtVYIVzh.html | 1763527857-thumbnail.png |
| 工业制氧原理 | chemistry | oxygen-production-principle | WZilbL7bRU8F7tbu.html | 1763529470-thumbnail.png |
| 斜抛中的能量转化 | physics | oblique-throw-energy | 1KDlGzWcc8Igoo9L.html | 1763529786-thumbnail.png |
| 焦耳定律（电流热效应）实验 | physics | joule-law-experiment | OFWK8Qe1IhwLHBRK.html | 1763530073-thumbnail.png |
| 四冲程汽油机工作原理演示 | physics | four-stroke-engine | qJM3jlZPdiKANsyF.html | 1763530398-thumbnail.png |
| 电铃工作原理演示 | physics | electric-bell-principle | 4bEQo2G1e1EZabPT.html | 1763530972-thumbnail.png |
| 中和反应 | chemistry | neutralization-reaction | ywXPexpKHmjW4JDK.html | 1763531116-thumbnail.png |
| 动能的影响因素 | physics | kinetic-energy-factors | 4TMwwUJm898yBiGa.html | 1763531775-thumbnail.png |
| 色光的混合 | physics | color-light-mixing | DDbZRgbfUwBsVTeq.html | 1763531568-thumbnail.png |
| 伽利略望远镜 | physics | galileo-telescope | J5Ir1C9zUjSqIH6A.html | 1763532578-thumbnail.png |
| 模拟膈肌的运动 | biology | diaphragm-movement-simulation | VlsficyDSW9MdSSr.html | 1763532290-thumbnail.png |
| 开普勒望远镜 | physics | kepler-telescope | TBWjb12xKkBYI6NL.html | 1763532547-thumbnail.png |
| 光学显微镜成像原理 | physics | microscope-imaging | BQPrQVtojEceTCHu.html | 1763532678-thumbnail.png |
| 凸透镜成像 | physics | convex-lens-imaging | d5mwzGCDPuC2ar9L.html | 1763532866-thumbnail.png |
| 启普发生器 | chemistry | kipp-generator | EzKPaCprfN7lJxow.html | 1763533315-thumbnail.png |
| 向下排气法 | chemistry | downward-air-discharge | CfTqLdpIB6qlFgtk.html | 1763533760-thumbnail.png |
| 拉瓦锡实验 | chemistry | lavoisier-experiment | jKFEPFQ7FRUBBSBi.html | 1763533576-thumbnail.png |
| 用拼图表达整式运算 | mathematics | puzzle-polynomial-operations | gsGjXvJxEm3xPlTL.html | 1763536757-thumbnail.png |
| 月历中的数学 | mathematics | calendar-mathematics | CDCQqPrmSPw67iVv.html | 1763536979-thumbnail.png |
| 轴对称 | mathematics | axial-symmetry | RcOhNZB6iM4QAzbY.html | 1763537127-thumbnail.png |
| 中心对称 | mathematics | central-symmetry | 8viI1B0iSp4KTMtk.html | 1763537253-thumbnail.png |
| 坐标轴对称 | mathematics | coordinate-axis-symmetry | QB7DlSh01aMS3f4E.html | 1763537424-thumbnail.png |
| 坐标表示平移 | mathematics | coordinate-translation | z3PEXr56eEQzG0lp.html | 1763537600-thumbnail.png |
| 正切 | mathematics | tangent | EshQDqk9658IV3xS.html | 1763537779-thumbnail.png |
| 正弦和余弦 | mathematics | sine-cosine | r861uBY0vFjXirZq.html | 1763537928-thumbnail.png |
| 作三角形的外接圆 | mathematics | triangle-circumcircle-construction | qESpvrUA8IeHCkfQ.html | 1763544054-thumbnail.png |
| 作三角形的内切圆 | mathematics | triangle-incircle-construction | LcpaQ86YEYfoTNcL.html | 1763543863-thumbnail.png |
| 图形的平移 | mathematics | geometric-translation | f0uWIDQtaUIL6amW.html | 1763544234-thumbnail.png |
| 平行线被折线所截 | mathematics | parallel-lines-cut-by-broken-line | YA9NOBsNUVifHvQ9.html | 1763544330-thumbnail.png |
| 三角形的内切圆与外接圆 | mathematics | triangle-incircle-circumcircle | 3Vq7NIjac4loZdi2.html | 1763544592-thumbnail.png |
| 不等式的性质：用天平模拟不等关系 | mathematics | inequality-balance-simulation | 0xlbFOExI04CVVOY.html | 1763545079-thumbnail.png |
| 三角形的分类：按边分 | mathematics | triangle-classification-by-side | CABRovymOSRt4JHx.html | 1763544955-thumbnail.png |
| 两圆的位置关系与公切线 | mathematics | two-circles-position-tangent | 84Z0KYtn8CbKr71G.html | 1763545275-thumbnail.png |
| 三角形的高、中线与角平分线 | mathematics | triangle-altitude-median-bisector | KlS4KJKvzCtb7BZp.html | 1763545473-thumbnail.png |
| 车轮中的数学道理 | mathematics | wheel-mathematics | kQohag8h7gyPXbvB.html | 1763546155-thumbnail.png |
| 一次函数的应用：追及问题 | mathematics | linear-function-chase | 30AfZs8oi0TRvvLM.html | 1763552309-thumbnail.png |
| 一次函数的应用：相遇问题可视化 | mathematics | linear-function-meeting | 41rzzOHhxC48N6VE.html | 1763553620-thumbnail.png |

## 三、文件复制脚本

```powershell
# 读取CSV并复制文件
$csvPath = "tm_gallery.csv"
$galleryPath = "gallery"
$thumbnailPath = "thumbnail"
$destBase = "teaching-aids/assets"

# 分类函数
function Get-Category($title, $desc) {
    $text = ($title + $desc).ToLower()
    if ($text -match '电流|电压|电阻|电路|电子|电磁|滑轮|杠杆|摩擦|光学|透镜|望远镜|显微镜|色光|功|功率|热传递|发动机|航空|磁场|电荷|静电|导体|图斯|维维尼亚') { return 'physics' }
    if ($text -match '化学|酸碱|中和|反应|溶解|蒸发|分子|原子|离子|元素|氧气|制氧|溶液|排气|集气|发生器|拉瓦锡') { return 'chemistry' }
    if ($text -match '生物|细胞|植物|动物|人体|种子|萌芽|生长|骨骼|肌肉|器官|遗传|DNA|基因|进化|生态|食物链|病毒|膈肌') { return 'biology' }
    if ($text -match '地球|地理|地质|天文|宇宙|星球|行星|太阳|月球|自转|公转|节气|四季|经纬度|地形|火山|地震|星空') { return 'earth_science' }
    if ($text -match '数学|数独|华容道|计算|整数|小数|分数|坐标|函数|方程|不等式|几何|图形|三角形|圆|正方形|长方|多边形|周长|面积|体积|勾股|正弦|余弦|正切|平移|旋转|统计|概率|24点|拼图|五子棋|象棋') { return 'mathematics' }
    if ($text -match '二维码|计时器|流程图|提词器|汉字') { return 'general_science' }
    return 'other'
}

# slug映射表（简化版）
$slugMap = @{
    '解释电流的形成' = 'current-formation-explanation'
    '植树问题' = 'tree-planting-problem'
    '掷一掷' = 'dice-probability'
    '跑道长度差异可视化' = 'track-length-difference'
    '英语动物单词闪卡' = 'english-animal-flashcards'
    '智能教室分贝监测系统' = 'classroom-noise-monitor'
    '追及相遇问题互动游戏' = 'chase-meet-interactive'
    '摸球模拟器' = 'ball-touch-simulator'
    '智能英文填字游戏生成器' = 'english-crossword-generator'
    'AI骨骼识别' = 'ai-skeleton-recognition'
    '制作花钟（左侧鲜花，右侧钟表）' = 'flower-clock'
    '认知分类游戏(动物/水果/蔬菜)' = 'cognitive-classification-game'
    '探索正方形中的小正方形' = 'small-squares-in-square'
    '地球的内核' = 'earth-inner-core'
    '地球内核探究' = 'earth-core-exploration'
    '课堂计时器' = 'classroom-timer'
    '计时器（小）' = 'timer-small'
    '教室分贝监测系统（新）' = 'classroom-noise-monitor-new'
    '数字华容道' = 'digital-klotski'
    '华容道' = 'klotski'
    '2、3、5的倍数特征练习' = 'multiple-235-practice'
    '俄罗斯方块（新）' = 'tetris-new'
    '24点数字游戏' = '24-point-game'
    '数独' = 'sudoku'
    '分数学习互动' = 'fraction-learning'
    '单位换算挑战' = 'unit-conversion-challenge'
    '小小收银员' = 'little-cashier'
    '音乐协作' = 'music-collaboration'
    '滑动与滚动' = 'sliding-rolling'
    '手电筒的工作原理和构造' = 'flashlight-principle'
    '火山构造教学演示' = 'volcano-structure-demo'
    '八大行星排序' = 'eight-planets-sorting'
    '探索两圆相交' = 'two-circles-intersection'
    '二十四节气流转图' = 'solar-terms-cycle'
    '探索酒精增发的快慢' = 'alcohol-evaporation-speed'
    '潜望镜的原理' = 'periscope-principle'
    '种子萌芽条件' = 'seed-germination-conditions'
    '探究溶解的快慢' = 'dissolution-speed-explore'
    '定滑轮演示' = 'fixed-pulley-demo'
    '动滑轮演示' = 'movable-pulley-demo'
    '围长方形演示' = 'rectangle-perimeter-demo'
    '探究摩擦力大小的影响因素' = 'friction-factors-explore'
    '热传递的三种方式' = 'heat-transfer-three-ways'
    '视觉暂留现象' = 'persistence-of-vision'
    '多力杠杆平衡演示' = 'multi-force-lever-balance'
    '梁桥原理演示' = 'beam-bridge-principle'
    '拱桥原理演示' = 'arch-bridge-principle'
    '向上排气法' = 'upward-air-discharge'
    '钢架桥受力原理' = 'steel-bridge-force'
    '排水集气法' = 'water-displacement-gas'
    '悬索桥受理原理' = 'suspension-bridge-force'
    '斜拉桥受力演示' = 'cable-stayed-bridge-force'
    '星舰起飞返回3D模拟' = 'starship-launch-3d'
    '飞机起飞作用力模拟' = 'airplane-takeoff-force'
    '工业制氧原理' = 'oxygen-production-principle'
    '斜抛中的能量转化' = 'oblique-throw-energy'
    '焦耳定律（电流热效应）实验' = 'joule-law-experiment'
    '四冲程汽油机工作原理演示' = 'four-stroke-engine'
    '电铃工作原理演示' = 'electric-bell-principle'
    '中和反应' = 'neutralization-reaction'
    '动能的影响因素' = 'kinetic-energy-factors'
    '色光的混合' = 'color-light-mixing'
    '伽利略望远镜' = 'galileo-telescope'
    '模拟膈肌的运动' = 'diaphragm-movement-simulation'
    '开普勒望远镜' = 'kepler-telescope'
    '光学显微镜成像原理' = 'microscope-imaging'
    '凸透镜成像' = 'convex-lens-imaging'
    '启普发生器' = 'kipp-generator'
    '向下排气法' = 'downward-air-discharge'
    '拉瓦锡实验' = 'lavoisier-experiment'
    '用拼图表达整式运算' = 'puzzle-polynomial-operations'
    '月历中的数学' = 'calendar-mathematics'
    '轴对称' = 'axial-symmetry'
    '中心对称' = 'central-symmetry'
    '坐标轴对称' = 'coordinate-axis-symmetry'
    '坐标表示平移' = 'coordinate-translation'
    '正切' = 'tangent'
    '正弦和余弦' = 'sine-cosine'
    '作三角形的外接圆' = 'triangle-circumcircle-construction'
    '作三角形的内切圆' = 'triangle-incircle-construction'
    '图形的平移' = 'geometric-translation'
    '平行线被折线所截' = 'parallel-lines-cut-by-broken-line'
    '三角形的内切圆与外接圆' = 'triangle-incircle-circumcircle'
    '不等式的性质：用天平模拟不等关系' = 'inequality-balance-simulation'
    '三角形的分类：按边分' = 'triangle-classification-by-side'
    '两圆的位置关系与公切线' = 'two-circles-position-tangent'
    '三角形的高、中线与角平分线' = 'triangle-altitude-median-bisector'
    '车轮中的数学道理' = 'wheel-mathematics'
    '一次函数的应用：追及问题' = 'linear-function-chase'
    '一次函数的应用：相遇问题可视化' = 'linear-function-meeting'
}

# 读取CSV并处理
$rows = Import-Csv $csvPath -Encoding UTF8
foreach ($row in $rows) {
    $title = $row.title
    $desc = $row.description
    $galleryUrl = $row.gallery_url
    $thumbnail = $row.thumbnail

    $category = Get-Category $title $desc
    $slug = if ($slugMap[$title]) { $slugMap[$title] } else { $title.ToLower().Replace(' ', '-').Replace('（', '').Replace('）', '').Replace('(', '').Replace(')', '') }

    $htmlFile = $galleryUrl.Replace('/gallery/', '').Trim('/')
    if (-not $htmlFile.EndsWith('.html')) { $htmlFile += '.html' }

    $thumbFile = Split-Path $thumbnail -Leaf

    $destDir = "$destBase/$category/$slug"

    # 创建目录
    New-Item -ItemType Directory -Path $destDir -Force | Out-Null

    # 复制HTML并重命名
    $srcHtml = "$galleryPath/$htmlFile"
    $destHtml = "$destDir/index.html"
    if (Test-Path $srcHtml) {
        Copy-Item $srcHtml $destHtml -Force
        Write-Host "复制: $htmlFile -> $destHtml"
    } else {
        Write-Warning "找不到: $srcHtml"
    }

    # 复制缩略图并重命名为cover.png
    $srcThumb = "$thumbnailPath/$thumbFile"
    $destThumb = "$destDir/cover.png"
    if (Test-Path $srcThumb) {
        Copy-Item $srcThumb $destThumb -Force
        Write-Host "复制: $thumbFile -> $destThumb"
    } else {
        Write-Warning "找不到: $srcThumb"
    }
}

Write-Host "完成！"
```

## 四、生成Manifest的Python脚本

```python
import csv
import json
import re

def classify_item(title, description):
    title_desc = (title + ' ' + description).lower()
    if any(k in title_desc for k in ['电流','电压','电阻','电路','电子','电磁','滑轮','杠杆','摩擦','光学','透镜','望远镜','显微镜','色光','功','功率','热传递','发动机','航空','磁场','电荷','静电','导体']):
        return 'physics'
    if any(k in title_desc for k in ['化学','酸碱','中和','反应','溶解','蒸发','分子','原子','离子','元素','氧气','制氧','溶液','排气','集气','发生器','拉瓦锡']):
        return 'chemistry'
    if any(k in title_desc for k in ['生物','细胞','植物','动物','人体','种子','萌芽','生长','骨骼','肌肉','器官','遗传','DNA','基因','进化','生态','病毒']):
        return 'biology'
    if any(k in title_desc for k in ['地球','地理','地质','天文','宇宙','星球','行星','太阳','月球','自转','公转','节气','四季','经纬度','地形','火山','地震','星空']):
        return 'earth_science'
    if any(k in title_desc for k in ['数学','数独','华容道','计算','整数','小数','分数','坐标','函数','方程','不等式','几何','图形','三角形','圆','正方形','多边形','周长','面积','体积','勾股','正弦','平移','旋转','24点','拼图','五子棋','象棋']):
        return 'mathematics'
    if any(k in title_desc for k in ['二维码','计时器','流程图','提词器','汉字']):
        return 'general_science'
    return 'other'

items = []
with open('tm_gallery.csv', 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    for row in reader:
        title = row['title']
        desc = row['description'] or ''
        category = classify_item(title, desc)
        slug = title.lower().replace(' ', '-').replace('（','').replace('）','')[:50]
        html_file = row['gallery_url'].replace('/gallery/', '').strip('/')
        if not html_file.endswith('.html'):
            html_file += '.html'

        items.append({
            "name": title,
            "slug": slug,
            "category": category,
            "summary": desc[:100] if desc else title,
            "cover_image": f"{category}/{slug}/cover.png",
            "diagram_image": f"{category}/{slug}/diagram.png",
            "html_entry": f"{category}/{slug}/index.html",
            "source_filename": html_file,
            "tags": [category]
        })

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
    "items": items
}

with open('teaching-aids.json', 'w', encoding='utf-8') as f:
    json.dump(manifest, f, ensure_ascii=False, indent=2)

print(f"已生成 teaching-aids.json，共 {len(items)} 个教具")
```

## 五、操作步骤

1. **创建目录结构**
   ```powershell
   # 在 server/storage/ 下执行
   @('physics','chemistry','biology','earth_science','mathematics','general_science','other') | ForEach-Object { New-Item -ItemType Directory -Path "teaching-aids/assets/$_" -Force }
   ```

2. **运行文件复制脚本**（上面的PowerShell脚本）

3. **生成Manifest**
   ```bash
   python generate_manifest.py
   ```

4. **校验**
   ```bash
   python D:/pcode/ownenglish/tools/validate_teaching_aids_manifest.py
   ```

5. **后台同步**
   - 登录管理后台
   - 进入"数字化教具"
   - 点击"同步Manifest"

## 六、分类规则速查

| 分类 | 关键词 |
|------|--------|
| physics | 电流、电压、电阻、电路、电子、滑轮、杠杆、摩擦、光学、透镜、望远镜、显微镜、热传递、发动机 |
| chemistry | 化学、酸碱、中和、反应、溶解、蒸发、分子、原子、离子、元素、氧气、排气、集气 |
| biology | 生物、细胞、植物、动物、人体、种子、萌芽、骨骼、肌肉、器官、遗传、DNA、进化、生态 |
| earth_science | 地球、地理、天文、宇宙、星球、太阳、月球、自转、公转、节气、地形、火山、地震、星空 |
| mathematics | 数学、数独、华容道、计算、整数、小数、分数、坐标、函数、方程、几何、图形、三角形、面积、体积 |
| general_science | 二维码、计时器、流程图、提词器、汉字 |
| other | 不属于以上类别的 |
