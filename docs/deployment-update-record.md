# 宸查儴缃茬郴缁熸洿鏂拌褰?
## 璇存槑

鏈枃浠舵槸绾夸笂绯荤粺鍗囩骇鐨勫敮涓€璁板綍鏂囨。銆傛墍鏈夊奖鍝嶇嚎涓婄郴缁熺殑淇敼锛岄兘蹇呴』杩藉姞璁板綍鍒拌繖閲屻€?
姣忔璁板綍鑷冲皯鍖呭惈锛?
1. 鏃ユ湡 / 鐗堟湰
2. 淇敼鑼冨洿
3. 涓昏鏂囦欢
4. 閮ㄧ讲瑕佹眰
5. 鍙戝竷鍚庨噸鐐瑰洖褰?6. 褰撳墠閮ㄧ讲缁撹

鍥哄畾璁板綍椤癸細

1. 鍓嶇鏄惁闇€瑕侀噸鍙戠増
2. 鍚庣鏄惁闇€瑕侀噸鍚?3. 鏄惁闇€瑕佹暟鎹簱杩佺Щ
4. 鏄惁闇€瑕佺幆澧冨彉閲忓彉鏇?
---

## 2026-04-04 鐧芥澘鍙屼汉 PK 寮€鍦哄€掕鏃跺崱浣忎慨澶?
### 淇敼鑼冨洿

1. 淇鐧芥澘妯″紡鍙戣捣鍙屼汉 PK 鏃讹紝瀛︾敓绔紑鍦?3 绉掑€掕鏃跺仠鍦?`3` 涓嶅姩鐨勯棶棰?2. 淇闈炲崟棰樺鎴樼殑 challenge progress 涓婃姤鍥炵幆锛岄伩鍏嶅弽澶嶉噸寤哄紑鍦哄€掕鏃跺畾鏃跺櫒
3. 淇濇寔鍚屼竴鍦?challenge 鐨勫紑鍦哄€掕鏃跺彧鍦ㄩ娆¤繘鍏ユ椂鍒濆鍖栵紝涓嶈閲嶅 `room_info / challenge_started` 閲嶇疆

### 涓昏鏂囦欢

鍓嶇锛?
1. `client/src/pages/student/Live.tsx`

### 閮ㄧ讲瑕佹眰

1. 鍓嶇锛氶渶瑕侀噸鍙戠増
2. 鍚庣锛氫笉闇€瑕佹洿鏂?3. 鏁版嵁搴撹縼绉伙細鏃?4. 鐜鍙橀噺鍙樻洿锛氭棤

### 鍙戝竷鍚庨噸鐐瑰洖褰?
1. 鐧芥澘妯″紡鍙戣捣鍙屼汉 PK 鍚庯紝瀛︾敓绔紑鍦哄€掕鏃跺簲浠?`3 -> 2 -> 1 -> 0`
2. 鍊掕鏃剁粨鏉熷悗锛屽弬涓庡鐢熷彲浠ユ甯搁€夋嫨鍜屾彁浜?3. 闈炲弬涓庡鐢熶粛淇濇寔鍥磋鎬?4. 鍙屼汉 PK 杩囩▼涓笉搴斿嚭鐜?challenge 寮€鍦哄€掕鏃惰鍐嶆閲嶇疆

### 褰撳墠閮ㄧ讲缁撹

1. 鍓嶇闇€瑕侀噸鍙戠増
2. 鍚庣鏃犻渶鏇存柊
3. 鏃犳暟鎹簱杩佺Щ
4. 鏃犵幆澧冨彉閲忓彉鏇?
---

## 2026-04-04 浜掑姩闂幆鏈€鍚庝竴杞郴缁熷姞鍥?
### 淇敼鑼冨洿

1. 鐧芥澘銆佷簰鍔ㄧ鐞嗐€佸鐢熺杩愯鎬佺户缁粺涓€鍒版湇鍔＄鎴块棿鎬佸拰 challenge 浜嬩欢
2. 鎶藉叡浜?challenge runtime 杈呭姪灞?3. 鎻愪氦鍙嶉銆佺粨鏉熸€併€佸弬涓庢€佺户缁敹鍙?4. 鐧芥澘涓庝簰鍔ㄧ鐞嗚亴璐ｅ浐瀹?5. 鍘嗗彶銆佹槑缁嗐€佸垎鏋愮户缁寜 `session_id` 闅旂
6. 澧炲姞鍚庣鍏抽敭鏃ュ織鍜屽墠绔?`debug_live` 璋冭瘯寮€鍏?
### 涓昏鏂囦欢

鍓嶇锛?
1. `client/src/features/live-runtime/challengeRuntime.ts`
2. `client/src/features/live-runtime/debug.ts`
3. `client/src/services/websocket.ts`
4. `client/src/pages/student/Live.tsx`
5. `client/src/features/whiteboard/hooks/useWhiteboardLive.ts`
6. `client/src/features/teacher-live/hooks/useTeacherLive.ts`
7. `client/src/features/teacher-live/hooks/useTeacherLivePage.ts`
8. `client/src/features/teacher-live/components/ChallengePanel.tsx`
9. `client/src/pages/teacher/WhiteboardMode.tsx`

鍚庣锛?
1. `server/app/core/websocket.py`
2. `server/app/api/v1/live/websocket_handlers.py`

### 閮ㄧ讲瑕佹眰

1. 鍓嶇锛氶渶瑕侀噸鍙戠増
2. 鍚庣锛氶渶瑕侀噸鍚?3. 鏁版嵁搴撹縼绉伙細鏃?4. 鐜鍙橀噺鍙樻洿锛氭棤

### 鍙戝竷鍚庨噸鐐瑰洖褰?
鐧芥澘锛?
1. 鐧芥澘鍙戣捣鍙屼汉 PK锛岃閫?2 浜鸿繘鍏ュ弬涓庢€侊紝鍏朵粬浜哄洿瑙?2. 鐧芥澘鍙戣捣鍗曢鎶㈢瓟锛岃閫?2 浜鸿繘鍏ユ姠绛旈〉锛屽叾浠栦汉鍥磋
3. 鐧芥澘鍙戣捣鍏ㄧ彮鎸戞垬锛屾墍鏈夊凡杩涘叆璇惧爞瀛︾敓杩涘叆鎸戞垬椤?4. 鐧芥澘鍒锋柊銆佹櫄鍔犲叆銆佹柇绾块噸杩炲悗锛屼笉娈嬬暀鏃т换鍔?/ 鏃ф寫鎴?5. 瀛︾敓杩涘叆鏁欏銆佹彁浜や换鍔°€佸垎浜€氳繃 / 蹇界暐鏃讹紝鐧芥澘鍗虫椂鏇存柊

浜掑姩绠＄悊锛?
1. 鍙戝竷浠诲姟鍚庝笉鍐嶆湰鍦版嫾 `active/history`
2. 鍙戣捣 PK / 鍗曢鎶㈢瓟 / 鍏ㄧ彮鎸戞垬鍚庯紝鍙瓑寰呮湇鍔＄鐘舵€佽惤瀹?3. 杩涜涓换鍔″崱鐗囪涔夋纭細
   - 鏌ョ湅杩涜涓换鍔?   - 缁撴潫浠诲姟
4. 鍚屽悕浠诲姟澶氬満娆℃椂锛屽巻鍙叉帓搴忋€佹槑缁嗐€佸垎鏋愭寜 `session_id` 姝ｇ‘闅旂

瀛︾敓绔細

1. 鍙備笌鎬?/ 鍥磋鎬佹寜鏈嶅姟绔?challenge 鎭㈠
2. 鎻愪氦鍚庣珛鍗虫樉绀虹瓑寰呯粨鏋?3. 涓€浜哄厛绛斿銆佸彟涓€浜鸿鍔ㄧ粨鏉熸椂锛岀粨鏉熸€佹纭?4. 鏁欏笀鎻愬墠缁撴潫鍚庯紝瀛︾敓绔珛鍗崇粺涓€缁撴潫

### 褰撳墠閮ㄧ讲缁撹

1. 鍓嶇闇€瑕侀噸鍙戠増
2. 鍚庣闇€瑕侀噸鍚?3. 鏃犳暟鎹簱杩佺Щ
4. 鏃犵幆澧冨彉閲忓彉鏇?
---

## 2026-04-04 鏁板瓧鍖栨暀鍏峰簱绗竴鐗?
### 淇敼鑼冨洿

1. 鏂板 `TeachingAid` 璧勬簮妯″瀷
2. 鏂板 `TeachingAidSession` 鍙楁帶璁块棶妯″瀷
3. 鍥哄畾鐩綍 + 鍥哄畾 Manifest 鐨勬暀鍏锋帴鍏ユ柟寮?4. 绠＄悊鍚庡彴鏁欏叿鍒楄〃銆佽鎯呫€佺姸鎬佸垏鎹€丮anifest 鍚屾
5. 鐧芥澘妯″紡鎵撳紑鏁板瓧鍖栨暀鍏峰簱
6. 鏁欏叿鍏ュ彛 HTML 鍙婂叾 JS/CSS/鍥剧墖瀛愯祫婧愬叏閮ㄨ蛋浼氳瘽鍖栧彈鎺ц闂?7. 鏂板鎵归噺鐘舵€佸垏鎹?8. 鏂板鍚屾鎶ュ憡澶嶅埗 / 涓嬭浇
9. 鏂板鐧芥澘鏈€杩戜娇鐢ㄦ暀鍏?10. 鏂板鍔犺浇澶辫触鍜岀┖鐘舵€佷紭鍖?11. 鏂板鏈湴 Manifest 鏍￠獙鑴氭湰

### 涓昏鏂囦欢

鍓嶇锛?
1. `client/src/App.tsx`
2. `client/src/components/layout/AdminLayout.tsx`
3. `client/src/features/teaching-aids/TeachingAidLibraryModal.tsx`
4. `client/src/features/teaching-aids/utils.ts`
5. `client/src/i18n/index.ts`
6. `client/src/i18n/teaching-aids-zh-CN.json`
7. `client/src/pages/admin/TeachingAidDetail.tsx`
8. `client/src/pages/admin/TeachingAids.tsx`
9. `client/src/pages/teacher/WhiteboardMode.tsx`
10. `client/src/services/api.ts`

鍚庣锛?
1. `server/app/api/v1/teaching_aids.py`
2. `server/app/main.py`
3. `server/app/models/__init__.py`
4. `server/app/services/teaching_aids.py`

璧勬簮涓庢牎楠岋細

1. `server/storage/teaching-aids/assets/`
2. `server/storage/teaching-aids/manifests/teaching-aids.json`
3. `tools/validate_teaching_aids_manifest.py`
4. `docs/teaching-aids-rollout-guide.md`

### 閮ㄧ讲瑕佹眰

1. 鍓嶇锛氶渶瑕侀噸鍙戠増
2. 鍚庣锛氶渶瑕侀噸鍚?3. 鏁版嵁搴撹縼绉伙細鏃犳墜宸ヨ縼绉?4. 鐜鍙橀噺鍙樻洿锛氭棤

璇存槑锛?
1. 褰撳墠椤圭洰缁х画浣跨敤鍚姩鏃?`create_all`
2. 棣栨閲嶅惎鍚庝細鑷姩鍒涘缓 `TeachingAid` 鍜?`TeachingAidSession` 琛?
### 鎵嬪伐鎺ュ叆姝ラ

1. 鎸夊垎绫绘妸鏁欏叿鐩綍鏀惧埌锛?   - `server/storage/teaching-aids/assets/<category>/<slug>/`
2. 姣忎釜鏁欏叿鐩綍鑷冲皯鍖呭惈锛?   - `index.html`
   - 鍙€?`cover.png`
   - 鍙€?`diagram.png`
   - 鍏朵粬瀛愯祫婧愮洰褰曪紝渚嬪 `assets/`
3. 鏇存柊锛?   - `server/storage/teaching-aids/manifests/teaching-aids.json`
4. 鏈湴杩愯锛?   - `py -3 D:\pcode\ownenglish\tools\validate_teaching_aids_manifest.py`
5. 淇鎵€鏈?`blocked` 鏉＄洰
6. 绠＄悊鍛樿繘鍏ュ悗鍙扳€滄暟瀛楀寲鏁欏叿鈥濋〉鎵ц `sync-manifest`
7. 鍚庡彴鎶芥骞跺垎鎵瑰垏鍒?`active`
8. 鏁欏笀鍦ㄧ櫧鏉挎ā寮忎腑鎸夊垎绫绘墦寮€鏁欏叿搴撹繘琛屾娊鏍烽獙鏀?
### 鍙戝竷鍚庨噸鐐瑰洖褰?
Manifest 涓庡悗鍙帮細

1. 鍚堟硶鏉＄洰鍙柊澧炴垨鏇存柊 `TeachingAid`
2. 鍒嗙被缂哄け銆佸叆鍙ｄ笉瀛樺湪銆佽矾寰勮秺鐣屼細鎶ラ敊骞惰烦杩?3. 鍚庡彴鍒楄〃鑳芥寜鍒嗙被鍜岀姸鎬佺瓫閫?4. 鍚庡彴璇︽儏椤靛彲缂栬緫鍚嶇О銆佸垎绫汇€佺畝浠嬨€佸師濮嬫枃浠跺悕銆佹爣绛?5. 鍗曟潯鐘舵€佸垏鎹㈡纭?6. 鎵归噺鐘舵€佸垏鎹㈡纭?7. 鍚屾鎶ュ憡涓殑閿欒鏉＄洰銆佺己澶辨潯鐩€佸鍒躲€佷笅杞藉姛鑳芥甯?
鏁欏笀鐧芥澘锛?
1. 鐧芥澘妯″紡鑳芥墦寮€鈥滄暟瀛楀寲鏁欏叿鈥濆叆鍙?2. 鑳芥寜鍒嗙被娴忚鏁欏叿
3. 鑳芥寜鍏抽敭璇嶆悳绱㈡暀鍏?4. 鏈€杩戜娇鐢ㄥ尯鑳芥樉绀烘渶杩戞墦寮€杩囩殑鏁欏叿
5. 鎵撳紑鏁欏叿鍚?iframe 鑳芥甯稿姞杞藉叆鍙?HTML
6. 鏁欏叿鍐呯殑 JS / CSS / 鍥剧墖瀛愯祫婧愰兘鑳芥甯稿姞杞?7. 鍔犺浇澶辫触鎻愮ず姝ｇ‘
8. 绌虹瓫閫夌姸鎬佹纭?
閴存潈涓庡畨鍏細

1. 鏈櫥褰曚笉鑳借皟鐢?`launch`
2. 鏈櫥褰曚笉鑳界洿鎺ユ墦寮€ session 鍦板潃
3. 杩囨湡 session 鏃犳硶缁х画璁块棶鏁欏叿璧勬簮
4. 鍙兘璁块棶褰撳墠 session 瀵瑰簲鏁欏叿鐩綍
5. 闃绘 `..` 璺緞绌胯秺
6. 涓嶈兘閫氳繃鐪熷疄闈欐€佽矾寰勭洿鎺ヨ闂暀鍏?
### 褰撳墠閮ㄧ讲缁撹

1. 鍓嶇闇€瑕侀噸鍙戠増
2. 鍚庣闇€瑕侀噸鍚?3. 鏃犳暟鎹簱鎵嬪伐杩佺Щ
4. 鏃犵幆澧冨彉閲忓彉鏇?## 2026-04-05 - 浜掑姩澶у睆闃舵 1-4 棣栬疆钀藉湴

- 淇敼鑼冨洿锛?  - 鏂板澶у睆浜掑姩妯″瀷銆佹帴鍙ｃ€佹暀甯堜晶缂栨帓椤点€佺櫧鏉垮惎鍔ㄥ叆鍙ｃ€佸ぇ灞忚繍琛岄〉銆侀鎵瑰弻浜哄鎴?renderer
- 涓昏鏂囦欢锛?  - `server/app/models/__init__.py`
  - `server/app/services/bigscreen_activities.py`
  - `server/app/api/v1/bigscreen_activities.py`
  - `server/app/main.py`
  - `client/src/services/api.ts`
  - `client/src/features/bigscreen-activities/components/*`
  - `client/src/pages/teacher/BigscreenActivities.tsx`
  - `client/src/pages/teacher/BigscreenActivityRun.tsx`
  - `client/src/pages/teacher/WhiteboardMode.tsx`
  - `client/src/components/layout/Layout.tsx`
  - `client/src/App.tsx`
- 閮ㄧ讲瑕佹眰锛?  - 鍓嶇闇€瑕侀噸鏂?build 骞跺彂甯?  - 鍚庣闇€瑕佸悓姝ヤ唬鐮佸苟閲嶅惎
  - 鏁版嵁搴撴棤闇€鎵嬪伐杩佺Щ锛宍create_all` 浼氳嚜鍔ㄥ缓鏂拌〃
  - 鐜鍙橀噺鏃犻渶鍙樻洿
- 鍥炲綊閲嶇偣锛?  - 鏁欏笀鍙湪鈥滃ぇ灞忎簰鍔ㄢ€濋〉鍒涘缓绱犳潗涓庢椿鍔ㄥ寘
  - 鐧芥澘妯″紡鍙墦寮€鈥滃ぇ灞忎簰鍔ㄢ€濆惎鍔ㄥ櫒
  - 鍙惎鍔ㄥ弻浜哄鎴樺苟杩涘叆杩愯椤?  - 閰嶅 / 鎺掑簭 / 鍒嗙被褰掔粍涓夌鐜╂硶閮借兘瀹屾垚涓€杞苟缁撶畻
  - 缁撴灉鍙繚鐣欐椿鍔ㄦ憳瑕侊紝涓嶈繘鍏ョ幇鏈変换鍔℃槑缁?/ 鍒嗘瀽
  - 鐜版湁鐧芥澘銆佷簰鍔ㄧ鐞嗐€佸钩鏉夸簰鍔ㄤ富閾捐矾涓嶅彈褰卞搷
## 2026-04-05 - 澶у睆浜掑姩绱犳潗/娲诲姩鍖呭氨缁姸鎬佽ˉ鍏?
- 淇敼鑼冨洿锛?  - 澶у睆浜掑姩鍒楄〃椤垫柊澧炰竴閿姸鎬佹祦锛?    - 绱犳潗锛歚鑽夌 -> 灏辩华`銆乣灏辩华 -> 鑽夌`
    - 娲诲姩鍖咃細`鑽夌 -> 灏辩华`銆乣灏辩华 -> 鑽夌`
  - 澶у睆浜掑姩鏂囨鏀跺彛锛?    - `active` 鍓嶇灞曠ず缁熶竴涓衡€滃氨缁€?  - 淇澶у睆浜掑姩绱犳潗鍗＄墖涓殑涔辩爜鍗犱綅鏂囨湰
- 涓昏鏂囦欢锛?  - `client/src/pages/teacher/BigscreenActivities.tsx`
  - `client/src/i18n/bigscreen-activities-zh-CN.json`
- 閮ㄧ讲瑕佹眰锛?  - 鍓嶇闇€瑕侀噸鍙戠増
  - 鍚庣涓嶉渶瑕佹洿鏂?  - 鏃犳暟鎹簱杩佺Щ
  - 鏃犵幆澧冨彉閲忓彉鏇?- 鍥炲綊閲嶇偣锛?  - 鏂板缓绱犳潗鍚庡彲鍦ㄥ垪琛ㄩ〉鐩存帴鈥滆涓哄氨缁€?  - 鏂板缓娲诲姩鍖呭悗鍙湪鍒楄〃椤电洿鎺モ€滆涓哄氨缁€?  - 宸插氨缁潯鐩彲鈥滆浆涓鸿崏绋库€?  - 娲诲姩鍖呯紪杈戝櫒鍙厑璁搁€夋嫨灏辩华绱犳潗
## 2026-04-05 - 澶у睆浜掑姩椤垫敼涓烘杩涘紡鎿嶄綔璺緞

- 淇敼鑼冨洿锛?  - 澶у睆浜掑姩椤甸《閮ㄦ柊澧?1-2-3 姝ヨ繘鍖猴紝璺緞缁熶竴涓猴細
    - 鍒涘缓绱犳潗
    - 缁勫悎娲诲姩鍖?    - 鐧芥澘鍚姩
  - 椤甸潰淇濈暀绱犳潗/娲诲姩鍖呭垪琛ㄧ鐞嗭紝浣嗕富鎿嶄綔椤哄簭鏀逛负鍜屸€滆鍓嶅噯澶団€濅竴鑷寸殑姝ヨ繘寮忓紩瀵?  - 澧炲姞姣忎竴姝ョ殑灏辩华鏁伴噺鎻愮ず鍜屼笅涓€姝ョ害鏉熸彁绀?- 涓昏鏂囦欢锛?  - `client/src/pages/teacher/BigscreenActivities.tsx`
  - `client/src/i18n/bigscreen-activities-zh-CN.json`
- 閮ㄧ讲瑕佹眰锛?  - 鍓嶇闇€瑕侀噸鍙戠増
  - 鍚庣涓嶉渶瑕佹洿鏂?  - 鏃犳暟鎹簱杩佺Щ
  - 鏃犵幆澧冨彉閲忓彉鏇?- 鍥炲綊閲嶇偣锛?  - 椤堕儴姝ヨ繘鍖烘樉绀烘纭?  - 鈥滃垱寤虹礌鏉?/ 缁勫悎娲诲姩鍖?/ 鐧芥澘鍚姩鈥濆姩浣滆矾寰勬纭?  - 鏃犲氨缁礌鏉愭椂涓嶈兘鐩存帴鏂板缓娲诲姩鍖?  - 鏃犲氨缁椿鍔ㄥ寘鏃朵笉鑳界洿鎺ュ幓鐧芥澘鍚姩
## 2026-04-05 - 鐧芥澘鎶㈢瓟/瀵规垬闈㈡澘椤堕儴瀹夊叏鍖轰慨澶?
- 淇敼鑼冨洿锛?  - 鐧芥澘妯″紡涓殑鏅€氬鎴樺脊灞傚鍔犻《閮ㄥ畨鍏ㄥ尯鍜屽唴閮ㄦ粴鍔?  - 鐧芥澘妯″紡涓殑鍏ㄥ睆瀵规垬灞傚ご閮ㄦ敼鎴愮嫭绔嬪浐瀹氬畨鍏ㄥ尯锛屽唴瀹瑰尯鍗曠嫭璁╀綅
  - 淇鎶㈢瓟/瀵规垬椤甸潰椤堕儴琚櫧鏉垮伐鍏锋潯閬尅鐨勯棶棰?  - 椤烘墜娓呯悊鍓嶇鐜板瓨绫诲瀷閿欒锛屾仮澶?`tsc` 鍙紪璇戠姸鎬?- 涓昏鏂囦欢锛?  - `client/src/pages/teacher/WhiteboardMode.tsx`
  - `client/src/features/tasks/task-editor-components.tsx`
- 閮ㄧ讲瑕佹眰锛?  - 鍓嶇闇€瑕侀噸鍙戠増
  - 鍚庣涓嶉渶瑕佹洿鏂?  - 鏃犳暟鎹簱杩佺Щ
  - 鏃犵幆澧冨彉閲忓彉鏇?- 鍥炲綊閲嶇偣锛?  - 鐧芥澘妯″紡鍙戣捣鍙屼汉鎶㈢瓟鍚庯紝椤堕儴鏍囬鍖哄畬鏁村彲瑙?  - 鍏抽棴鎶曞睆 / 缁撴潫鎸戞垬鎸夐挳濮嬬粓鍙涓斿彲鐐瑰嚮
  - 闈炲叏灞忓鎴樺脊灞備笉浼氱户缁線涓婇《杩涚櫧鏉垮伐鍏锋潯
  - `client` 渚?`npx tsc --noEmit` 閫氳繃
## 2026-04-05 - 鐧芥澘瀵规垬闈㈡澘绐勫搴﹀竷灞€浼樺寲
- 淇敼鑼冨洿锛?  - `ChallengePanel` 鐨?board/compact 甯冨眬鏀逛负鎸夊彲鐢ㄥ搴﹁嚜閫傚簲
  - 涓嶅啀鎸夊睆骞曞搴﹀己鍒朵笁鍒楋紝閬垮厤鐧芥澘涓や晶闈㈡澘灞曞紑鏃堕€夋墜鍗¤鍘嬬獎
  - 鐘舵€佸尯鍦ㄧ獎瀹藉害涓嬫敼涓虹ǔ瀹氱殑鍒嗚甯冨眬锛岄伩鍏嶄腑鏂囨枃鏈鎸ゆ垚绔栨帓
- 涓昏鏂囦欢锛?  - `client/src/features/teacher-live/components/ChallengePanel.tsx`
- 閮ㄧ讲瑕佹眰锛?  - 鍓嶇闇€瑕侀噸鍙戠増
  - 鍚庣涓嶉渶瑕佹洿鏂?  - 鏃犳暟鎹簱杩佺Щ
  - 鏃犵幆澧冨彉閲忓彉鏇?- 鍥炲綊閲嶇偣锛?  - 鐧芥澘妯″紡鎮诞瀵规垬闈㈡澘涓紝閫夋墜鐘舵€佹枃鏈笉鍐嶈鎸ゆ垚绔栨帓
  - 鐧芥澘鍏ㄥ睆鎶曞睆涓斿乏鍙充晶鏍忓睍寮€鏃讹紝瀵规垬鍗＄墖浠嶄繚鎸佸彲璇诲竷灞€
  - `client` 渚?`npx tsc --noEmit` 閫氳繃
## 2026-04-05 - 杩涜涓换鍔℃彁浜ゆ暟鍚屾淇
- 淇敼鑼冨洿锛?  - 鏁欏笀绔簰鍔ㄧ鐞嗕粠 `room_info.task_group_submission_count` 鎭㈠杩涜涓换鍔＄殑鎻愪氦鏁?  - 鐧芥澘妯″紡浠?`room_info.task_group_submission_count` 鎭㈠褰撳墠浠诲姟缁勬彁浜ゆ暟
  - 浠诲姟缁勭粨鏉熸椂鍚屾娓呯┖鏃ф彁浜よ鏁帮紝閬垮厤娈嬬暀
- 涓昏鏂囦欢锛?  - `client/src/features/teacher-live/hooks/useTeacherLive.ts`
  - `client/src/features/whiteboard/hooks/useWhiteboardLive.ts`
- 閮ㄧ讲瑕佹眰锛?  - 鍓嶇闇€瑕侀噸鍙戠増
  - 鍚庣涓嶉渶瑕佹洿鏂?  - 鏃犳暟鎹簱杩佺Щ
  - 鏃犵幆澧冨彉閲忓彉鏇?- 鍥炲綊閲嶇偣锛?  - 瀛︾敓鎻愪氦杩涜涓换鍔″悗锛屼簰鍔ㄧ鐞嗕腑鐨勨€滄煡鐪嬭繘琛屼腑浠诲姟鈥濇彁浜ゆ暟浼氬悓姝ュ鍔?  - 鐧芥澘妯″紡涓殑杩涜涓换鍔℃彁浜ゆ暟浼氬悓姝ュ鍔?  - 鏁欏笀鍒锋柊椤甸潰鎴栧垏椤靛洖鏉ュ悗锛屾彁浜ゆ暟浠嶈兘浠?`room_info` 姝ｇ‘鎭㈠
## 2026-04-05 - 浠诲姟缁勯噸澶嶅満娆℃彁浜ゅ垽閲嶄慨澶?- 淇敼鑼冨洿锛?  - 浠诲姟缁勬彁浜ょ殑閲嶅鎻愪氦鏍￠獙鏀逛负浼樺厛鎸?`session_id + student_id` 鍒ら噸
  - 涓嶅啀浠呮寜 `group_id + student_id` 鍒ら噸锛岄伩鍏嶅悓涓€涓换鍔＄粍閲嶅浣跨敤鏃舵妸鏂板満娆¤鍒ゆ垚鈥滃凡鎻愪氦鈥?- 涓昏鏂囦欢锛?  - `server/app/api/v1/live/websocket_handlers.py`
- 閮ㄧ讲瑕佹眰锛?  - 鍓嶇涓嶉渶瑕佹洿鏂?  - 鍚庣闇€瑕侀噸鍚?  - 鏃犳暟鎹簱杩佺Щ
  - 鏃犵幆澧冨彉閲忓彉鏇?- 鍥炲綊閲嶇偣锛?  - 鍚屼竴涓换鍔＄粍閲嶅鍙戝竷绗簩娆℃椂锛屽鐢熶粛鍙甯告彁浜?  - 鏁欏笀绔€滆繘琛屼腑浠诲姟鈥濇彁浜や汉鏁颁細姝ｅ父澧炲姞
  - 瀛︾敓绔笉浼氬啀鍑虹幇鏈湴鏄剧ず宸叉彁浜ゃ€佹暀甯堢鍗村缁堜负 0 鐨勬儏鍐?## 2026-04-05 - 鐧芥澘澶у睆浜掑姩鍚姩鍣ㄥ彲璇绘€т紭鍖?- 淇敼鑼冨洿锛?  - 鎻愬崌澶у睆浜掑姩鍚姩鍣ㄥ脊绐楃殑鏁翠綋瀵规瘮搴?  - 璋冧寒鍓爣棰樸€佹爣绛俱€佺┖鐘舵€佸拰娲诲姩鍖呭崱鐗囪鏄庢枃瀛?  - 缁熶竴涓嬫媺妗嗗拰杈撳叆妗嗙殑娣辫壊涓婚鏂囨湰棰滆壊锛岄伩鍏嶆繁搴曟繁瀛楃湅涓嶆竻
- 涓昏鏂囦欢锛?  - `client/src/features/bigscreen-activities/components/BigscreenActivityLauncherModal.tsx`
- 閮ㄧ讲瑕佹眰锛?  - 鍓嶇闇€瑕侀噸鍙戠増
  - 鍚庣涓嶉渶瑕佹洿鏂?  - 鏃犳暟鎹簱杩佺Щ
  - 鏃犵幆澧冨彉閲忓彉鏇?- 鍥炲綊閲嶇偣锛?  - 鐧芥澘妯″紡鎵撳紑鈥滃ぇ灞忎簰鍔ㄢ€濆惎鍔ㄥ櫒鍚庯紝鏍囬銆佸壇鏍囬銆佹爣绛惧拰绌虹姸鎬佸潎娓呮櫚鍙
  - 涓嬫媺妗嗕腑鐨勯粯璁ら」鍜屽鐢熷鍚嶅湪娣辫壊鑳屾櫙涓嬪彲璇?## 2026-04-05 - 鐧芥澘椤堕儴鈥滃ぇ灞忎簰鍔ㄢ€濆叆鍙ｆ寜閽姣斿害浼樺寲
- 淇敼鑼冨洿锛?  - 鎻愪寒鐧芥澘椤堕儴宸ュ叿鏉′腑鈥滃ぇ灞忎簰鍔ㄢ€濆叆鍙ｆ寜閽殑鏂囧瓧銆佽竟妗嗗拰鑳屾櫙瀵规瘮搴?- 涓昏鏂囦欢锛?  - `client/src/pages/teacher/WhiteboardMode.tsx`
- 閮ㄧ讲瑕佹眰锛?  - 鍓嶇闇€瑕侀噸鍙戠増
  - 鍚庣涓嶉渶瑕佹洿鏂?  - 鏃犳暟鎹簱杩佺Щ
  - 鏃犵幆澧冨彉閲忓彉鏇?- 鍥炲綊閲嶇偣锛?  - 娣辫壊涓婚涓嬶紝鈥滃ぇ灞忎簰鍔ㄢ€濇寜閽枃瀛楁槑鏄惧彉娴咃紝鍙鎬ф彁鍗?## 2026-04-05 - 澶у睆浜掑姩浼氬憳闄愬埗涓庡惎鍔ㄥ櫒鏍囬鎻愪寒
- 淇敼鑼冨洿锛?  - 澶у睆浜掑姩鏂板浼氬憳閰嶉闄愬埗锛?    - 鍏嶈垂浼氬憳鏈€澶?5 涓礌鏉?    - 鍏嶈垂浼氬憳鏈€澶?2 涓椿鍔ㄥ寘
    - 浠樿垂浼氬憳涓嶉檺閲?  - 鍚庣鍒涘缓绱犳潗銆佸垱寤烘椿鍔ㄥ寘鏃跺鍔犲己鏍￠獙
  - 鍓嶇澶у睆浜掑姩椤靛鍔犻搴﹀睍绀恒€佽秴闄愮鐢ㄥ拰鏄庣‘鎻愮ず
  - 鐧芥澘鈥滃ぇ灞忎簰鍔ㄢ€濆惎鍔ㄥ櫒鏍囬涓庡壇鏍囬鎻愪寒锛屾彁鍗囨繁鑹茶儗鏅笅鍙鎬?- 涓昏鏂囦欢锛?  - `server/app/services/membership.py`
  - `server/app/api/v1/bigscreen_activities.py`
  - `client/src/services/api.ts`
  - `client/src/pages/teacher/BigscreenActivities.tsx`
  - `client/src/features/bigscreen-activities/components/BigscreenActivityLauncherModal.tsx`
- 閮ㄧ讲瑕佹眰锛?  - 鍓嶇闇€瑕侀噸鍙戠増
  - 鍚庣闇€瑕佸悓姝ヤ唬鐮佸苟閲嶅惎
  - 鏃犳暟鎹簱杩佺Щ
  - 鏃犵幆澧冨彉閲忓彉鏇?- 鍥炲綊閲嶇偣锛?  - 鍏嶈垂浼氬憳鍒涘缓鍒扮 5 涓礌鏉愬悗涓嶈兘缁х画鏂板缓绗?6 涓礌鏉?  - 鍏嶈垂浼氬憳鍒涘缓鍒扮 2 涓椿鍔ㄥ寘鍚庝笉鑳界户缁柊寤虹 3 涓椿鍔ㄥ寘
  - 浠樿垂浼氬憳涓嶅彈涓婅堪闄愬埗
  - 鐧芥澘妯″紡涓€滃ぇ灞忎簰鍔ㄢ€濆惎鍔ㄥ櫒鏍囬鈥滃惎鍔ㄥぇ灞忎簰鍔ㄢ€濆拰鍓爣棰樻竻鏅板彲璇?## 2026-04-05 - 鏁欏笀绔柊澧炴暟瀛楀寲鏁欏叿搴撻〉闈?- 淇敼鑼冨洿锛?  - 鏁欏笀绔柊澧炩€滄暟瀛楀寲鏁欏叿鈥濈嫭绔嬪伐鍏烽〉锛屽拰鈥滀簰鍔ㄧ鐞嗏€濆悓绾?  - 椤甸潰鏀寔鎸夊垎绫诲拰鍏抽敭璇嶆煡鎵俱€佹煡鐪嬩俊鎭€佹墦寮€棰勮浣跨敤
  - 鐧芥澘妯″紡椤堕儴鏂板鈥滆繘鍏ユ暀鍏峰簱椤甸潰鈥濆叆鍙?  - 澶嶇敤鐜版湁鐧芥澘鏁板瓧鍖栨暀鍏峰簱鐨勫悓涓€濂楁帴鍙ｄ笌浼氳瘽鍖栨墦寮€鑳藉姏
- 涓昏鏂囦欢锛?  - `client/src/pages/teacher/TeachingAids.tsx`
  - `client/src/App.tsx`
  - `client/src/components/layout/Layout.tsx`
  - `client/src/pages/teacher/WhiteboardMode.tsx`
  - `client/src/i18n/zh-CN.json`
  - `client/src/i18n/teaching-aids-zh-CN.json`
- 閮ㄧ讲瑕佹眰锛?  - 鍓嶇闇€瑕侀噸鍙戠増
  - 鍚庣涓嶉渶瑕佹洿鏂?  - 鏃犳暟鎹簱杩佺Щ
  - 鏃犵幆澧冨彉閲忓彉鏇?- 鍥炲綊閲嶇偣锛?  - 鏁欏笀渚ф诞鍔ㄥ鑸嚭鐜扳€滄暟瀛楀寲鏁欏叿鈥濆叆鍙?  - `/teacher/teaching-aids` 椤甸潰鍙甯稿姞杞芥暀鍏峰簱
  - 鏀寔鍒嗙被绛涢€夈€佸叧閿瘝鎼滅储銆佹渶杩戜娇鐢?  - 鐐瑰嚮鈥滄墦寮€鏁欏叿鈥濆悗椤甸潰涓嬫柟 iframe 鍙甯搁瑙?  - 鐧芥澘妯″紡涓€滆繘鍏ユ暀鍏峰簱椤甸潰鈥濇寜閽彲姝ｇ‘璺宠浆
## 2026-04-05 - 澶у睆浜掑姩椤甸搴﹀睍绀轰笌鍗＄墖鎸夐挳甯冨眬浼樺寲
- 淇敼鑼冨洿锛?  - 澶у睆浜掑姩椤甸《閮ㄥ鍔犲彸涓婅棰濆害鍗★紝鏄剧ず褰撳墠鍙垱寤虹礌鏉愭暟鍜屾椿鍔ㄥ寘鏁?  - 绉诲姩绔ˉ鍏呭悓鍙ｅ緞棰濆害灞曠ず
  - 绱犳潗鍗＄墖鍜屾椿鍔ㄥ寘鍗＄墖搴曢儴鎸夐挳鏀规垚涓ゅ垪缃戞牸锛岄伩鍏嶆寜閽孩鍑哄崱鐗?- 涓昏鏂囦欢锛?  - `client/src/pages/teacher/BigscreenActivities.tsx`
- 閮ㄧ讲瑕佹眰锛?  - 鍓嶇闇€瑕侀噸鍙戠増
  - 鍚庣涓嶉渶瑕佹洿鏂?  - 鏃犳暟鎹簱杩佺Щ
  - 鏃犵幆澧冨彉閲忓彉鏇?- 鍥炲綊閲嶇偣锛?  - 澶у睆浜掑姩椤甸《閮ㄥ彸涓婅鑳界湅鍒扮礌鏉愬拰娲诲姩鍖呴搴?  - 灏忓睆涓嬮搴﹀睍绀轰笉浼氫涪澶?  - 绱犳潗鍗＄墖涓殑鈥滆涓哄氨缁?/ 缂栬緫鈥濇寜閽笉鍐嶈秴鍑哄崱鐗?  - 娲诲姩鍖呭崱鐗囦腑鐨勨€滆涓哄氨缁?/ 缂栬緫鈥濇寜閽笉鍐嶈秴鍑哄崱鐗?## 2026-04-05 - 澶у睆浜掑姩鍗＄墖楂樺害涓庢爣绛炬樉绀轰紭鍖?- 淇敼鑼冨洿锛?  - 澶у睆浜掑姩椤电礌鏉愬崱鐗囦笌娲诲姩鍖呭崱鐗囩粺涓€鍥哄畾楂樺害
  - 绱犳潗鏍囩鍖烘敼涓哄浐瀹氬崟琛岄珮搴︼紝閬垮厤鏈夋爣绛炬椂鎶婂崱鐗囨拺楂?  - 娲诲姩鍖呭崱鐗囪ˉ榻愬崰浣嶉珮搴︼紝淇濊瘉涓庣礌鏉愬崱鐗囬珮搴︿竴鑷?- 涓昏鏂囦欢锛?  - client/src/pages/teacher/BigscreenActivities.tsx
- 閮ㄧ讲瑕佹眰锛?  - 鍓嶇闇€瑕侀噸鍙戠増
  - 鍚庣涓嶉渶瑕佹洿鏂?  - 鏃犳暟鎹簱杩佺Щ
  - 鏃犵幆澧冨彉閲忓彉鏇?- 鍥炲綊閲嶇偣锛?  - 鏈夋爣绛惧拰鏃犳爣绛剧殑绱犳潗鍗＄墖楂樺害涓€鑷?  - 娲诲姩鍖呭崱鐗囦笌绱犳潗鍗＄墖楂樺害涓€鑷?  - 鍗＄墖鎸夐挳涓嶅啀鍥犱负鍐呭楂樺害鍙樺寲鑰岄敊浣嶆垨婧㈠嚭
## 2026-04-05 - 澶у睆浜掑姩涓庢暟瀛楀寲鏁欏叿椤甸《閮ㄧ暀鐧戒慨姝?- 淇敼鑼冨洿锛?  - 澶у睆浜掑姩椤典笌鏁板瓧鍖栨暀鍏烽〉棣栧潡鍐呭鍖哄煙澧炲姞椤堕儴鐣欑櫧
  - 閬垮厤椤甸潰鍐呭涓庨《閮ㄥ伐鍏锋潯鐩存帴璐磋竟锛屾病鏈夎瑙夌紳闅?- 涓昏鏂囦欢锛?  - client/src/pages/teacher/BigscreenActivities.tsx
  - client/src/pages/teacher/TeachingAids.tsx
- 閮ㄧ讲瑕佹眰锛?  - 鍓嶇闇€瑕侀噸鍙戠増
  - 鍚庣涓嶉渶瑕佹洿鏂?  - 鏃犳暟鎹簱杩佺Щ
  - 鏃犵幆澧冨彉閲忓彉鏇?- 鍥炲綊閲嶇偣锛?  - 澶у睆浜掑姩椤甸鍧楀崱鐗囦笌椤堕儴宸ュ叿鏉′箣闂存湁绋冲畾鐣欑櫧
  - 鏁板瓧鍖栨暀鍏烽〉棣栧潡鍗＄墖涓庨《閮ㄥ伐鍏锋潯涔嬮棿鏈夌ǔ瀹氱暀鐧?

## 2026-04-08 - 课堂会话与课堂回顾收口修复
- 修改范围：
  - 修复课堂会话开始后数据库 `LiveSession` 与 WebSocket room `live_session_id` 不同步的问题
  - 白板模式开始本节课后立即主动刷新 `room_info`
  - 重写课堂回顾列表页与详情页，清理旧页面中的乱码、`@ts-nocheck` 和调试输出
  - 重写 `client/src/i18n/classroom-zh-CN.json`，统一课堂会话与课堂回顾文案
  - 修复前端主工程编译错误与白板弹幕类型不一致问题
- 主要文件：
  - `server/app/api/v1/live/classroom_sessions.py`
  - `server/app/api/v1/live/websocket_handlers.py`
  - `server/app/core/websocket.py`
  - `client/src/pages/teacher/Live.tsx`
  - `client/src/pages/teacher/WhiteboardMode.tsx`
  - `client/src/pages/teacher/ClassroomReview.tsx`
  - `client/src/pages/teacher/ClassroomReviewDetail.tsx`
  - `client/src/features/whiteboard/hooks/useWhiteboardLive.ts`
  - `client/src/i18n/classroom-zh-CN.json`
- 部署要求：
  - 前端需要重新 build 并发布
  - 后端需要同步代码并重启
  - 不需要数据库迁移
  - 不需要环境变量变更
- 回归重点：
  - 白板模式点击“开始本节课”后，`room_info.live_session_id` 能立即返回当前会话
  - 白板模式点击“结束本节课”后，课堂回顾中可看到本节课记录
  - 课堂回顾列表页文案、筛选和详情页基础信息正常显示
  - 课堂回顾详情页能显示摘要、参与学生和事件时间线
  - `client` 执行 `npx tsc --noEmit` 通过
  - `server/app` 执行 `py -3 -m compileall` 通过

## 2026-04-08 - 课堂回顾、AI 开关与弹幕收口
- 修改范围：
  - 重写课堂文案文件，清理课堂回顾页面仍在使用的乱码文案
  - 课堂回顾详情页新增弹幕数量摘要卡，并补充 i_settings_updated 事件文案
  - 班级 AI 设置接口重写，修复默认提示词与错误信息乱码，并在课堂进行中记录 AI 设置变更事件
  - 学生端 AI 接口和白板 AI 接口重写，修复提示词、错误信息和课堂问答文案乱码
  - 重写学生端 AI 面板、白板 AI 悬浮入口和白板 AI 面板，清理用户可见乱码
- 主要文件：
  - server/app/api/v1/class_ai_settings.py
  - server/app/api/v1/student_ai.py
  - server/app/api/v1/whiteboard_ai.py
  - server/app/api/v1/live/classroom_sessions.py
  - client/src/i18n/classroom-zh-CN.json
  - client/src/pages/teacher/ClassroomReviewDetail.tsx
  - client/src/features/whiteboard-ai/components/ClassAiSettingsModal.tsx
  - client/src/features/whiteboard-ai/components/WhiteboardAiLauncher.tsx
  - client/src/features/whiteboard-ai/components/WhiteboardAiPanel.tsx
  - client/src/features/whiteboard-ai/context/WhiteboardAiContext.tsx
  - client/src/features/student-ai/components/StudentAiPanel.tsx
- 部署要求：
  - 前端需要重新 build 并发布
  - 后端需要同步代码并重启
  - 不需要数据库迁移
  - 不需要环境变量变更
- 回归重点：
  - 课堂回顾列表、详情页文案正常显示，详情页可看到弹幕数量
  - 白板课堂中切换学生端 AI 开关后，课堂回顾时间线可看到 AI 设置更新事件
  - 学生端 AI 面板、白板 AI 面板和设置弹窗无乱码，错误提示可读
  - client 执行 
px tsc --noEmit 通过
  - server/app 执行 py -3 -m compileall 通过

## 2026-04-08 - 删除 ClassroomSessionBar 备用实现
- 修改范围：
  - 删除未被引用的 ClassroomSessionBar 备用组件，白板课堂会话入口统一收口到 WhiteboardMode.tsx 当前实现
  - 避免课堂会话条存在两套并行实现，降低后续维护分叉风险
- 主要文件：
  - client/src/features/whiteboard/components/ClassroomSessionBar.tsx
- 部署要求：
  - 前端需要重新 build 并发布
  - 后端不需要更新
  - 不需要数据库迁移
  - 不需要环境变量变更
- 回归重点：
  - 白板模式中的“开始本节课 / 结束本节课”按钮行为不受影响
  - 课堂回顾入口与白板课堂会话链路保持正常
## 2026-04-08 - 课堂会话状态并入白板实时运行态
- 修改范围：
  - 将白板模式中的课堂会话状态从独立 HTTP hook 并入 `useWhiteboardLive`
  - 课堂会话开始、结束、计时和当前 active session 恢复统一收口到白板实时运行态
  - 删除未再使用的 `useClassroomSession`，避免课堂会话出现 HTTP / WebSocket 双状态源
- 主要文件：
  - client/src/features/whiteboard/hooks/useWhiteboardLive.ts
  - client/src/pages/teacher/WhiteboardMode.tsx
  - client/src/features/whiteboard/hooks/useClassroomSession.ts
- 部署要求：
  - 前端需要重新 build 并发布
  - 后端不需要更新
  - 不需要数据库迁移
  - 不需要环境变量变更
- 回归重点：
  - 白板模式点击“开始本节课”后，白板顶部状态和 `room_info.live_session_id` 同步更新
  - 白板模式点击“结束本节课”后，课堂回顾可看到本节课记录
  - 白板刷新或切页返回后，当前 active classroom session 能正确恢复
  - client 执行 `npx tsc --noEmit` 通过
## 2026-04-08 - 课堂回顾用户可读化收口
- 修改范围：
  - 重写课堂回顾中文文案文件，清理列表页和详情页仍在使用的乱码文案
  - 课堂回顾详情页去掉原始事件 JSON 直接展示，改为按事件类型输出用户可读摘要
  - 课堂详情基础信息新增状态、入口模式等正式展示字段
- 主要文件：
  - client/src/i18n/classroom-zh-CN.json
  - client/src/pages/teacher/ClassroomReview.tsx
  - client/src/pages/teacher/ClassroomReviewDetail.tsx
- 部署要求：
  - 前端需要重新 build 并发布
  - 后端不需要更新
  - 不需要数据库迁移
  - 不需要环境变量变更
- 回归重点：
  - 课堂回顾列表页的状态、筛选、入口模式文案为正常中文
  - 课堂回顾详情页不再直接显示 payload JSON，而是显示用户可读摘要
  - 挑战、任务、AI 设置等时间线事件显示为可理解描述
  - client 执行 `npx tsc --noEmit` 通过

## 2026-04-08 璇惧爞鍥為【涓庣櫧鏉胯鍫傛彁閱掓敹鍙?- 淇敼鑼冨洿锛氭仮澶嶈鍫傚洖椤捐鎯呴〉鐨勭敤鎴峰彲璇诲睍绀猴紝琛ュ洖鍙戝竷浠诲姟鐨勫垎鏋?鏄庣粏鍏ュ彛銆佸脊骞曡褰曘€佸弬涓庡鐢熷睍绀轰紭鍖栵紱淇鐧芥澘妯″紡鈥滃紑濮嬫湰鑺傝鈥濇彁閱掕繘鍏ュ悗闂幇鐨勯棶棰樸€?- 涓昏鏂囦欢锛?  - client/src/pages/teacher/ClassroomReviewDetail.tsx
  - client/src/features/whiteboard/hooks/useWhiteboardLive.ts
  - client/src/pages/teacher/WhiteboardMode.tsx
  - client/src/features/danmu/components/AtmosphereEffects.tsx
- 閮ㄧ讲瑕佹眰锛氬墠绔渶瑕侀噸鏂?build 骞跺彂甯冿紱鍚庣涓嶉渶瑕佹洿鏂帮紱涓嶉渶瑕佹暟鎹簱杩佺Щ锛涗笉闇€瑕佺幆澧冨彉閲忓彉鏇淬€?- 鍥炲綊閲嶇偣锛?  1. 璇惧爞鍥為【璇︽儏椤靛彲鏌ョ湅璇惧爞鏃堕棿绾裤€佸彂甯冧换鍔°€佸脊骞曡褰曪紝涓斾笉鍐嶆樉绀哄鐢?ID銆?  2. 鍙戝竷浠诲姟鏀寔鏌ョ湅鍒嗘瀽鍜屾槑缁嗐€?  3. 鐧芥澘妯″紡杩涘叆鍚庯紝鈥滃紑濮嬫湰鑺傝鈥濇彁閱掍笉鍐嶄竴闂€岃繃锛屽彧鍦?room_info 鎭㈠瀹屾垚涓斿綋鍓嶆棤 active session 鏃舵樉绀恒€?  4. 鐧芥澘鍘熸湁涓婚摼璺笉鍙楀奖鍝嶃€?

## 2026-04-08 - 白板刷新班级恢复与课堂任务历史恢复
- 修改范围：
  - 白板模式刷新后，优先恢复“正在上课”的班级，而不是无条件落到班级列表第一个
  - 若没有进行中的课堂，则恢复上次在白板中选择的班级
  - 为课堂任务历史恢复提供稳定班级落点，避免因刷新后切到错误班级导致“本节课已完成任务”看起来丢失
- 主要文件：
  - client/src/pages/teacher/WhiteboardMode.tsx
- 部署要求：
  - 前端需要重新 build 并发布
  - 后端不需要更新
  - 不需要数据库迁移
  - 不需要环境变量变更
- 回归重点：
  1. 教师名下有多个班级时，若其中一个班级正在上课，刷新白板后应优先进入该班级
  2. 若没有进行中的课堂，刷新白板后应恢复上次选择的班级
  3. 白板切到正确班级后，“本节课已完成任务”刷新后仍能恢复显示
  4. client 执行 `npx tsc --noEmit` 通过

## 2026-04-08 - 白板本节课已完成任务刷新恢复
- 修改范围：
  - 白板模式恢复“本节课已完成任务”时，合并持久化任务历史与当前房间 `task_history`
  - 当前课堂的房间内结束任务记录会补上当前 `live_session_id`，刷新后优先参与本节课恢复
  - 白板在首个 `room_info` 恢复完成后，会再次按当前课堂口径加载本节课任务历史
- 主要文件：
  - client/src/features/whiteboard/hooks/useWhiteboardLive.ts
  - client/src/pages/teacher/WhiteboardMode.tsx
- 部署要求：
  - 前端需要重新 build 并发布
  - 后端不需要更新
  - 不需要数据库迁移
  - 不需要环境变量变更
- 回归重点：
  1. 白板模式中完成一个任务后，“本节课已完成任务”能显示
  2. 刷新页面后，当前课堂的已完成任务仍能恢复显示
  3. 同一节课连续完成多个任务，刷新后都能恢复
  4. client 执行 `npx tsc --noEmit` 通过

## 2026-04-08 - 白板刷新后恢复本节课已完成任务（后端房间历史回填）
- 修改范围：
  - 教师刷新重连时，按当前 active `live_session_id` 从数据库恢复本节课已结束的任务组历史到房间内存
  - 房间内 `published_tasks_history` 记录补充 `session_id`
  - `room_info / room_state.task_history` 现在可稳定用于白板刷新后的本节课历史恢复
- 主要文件：
  - server/app/api/v1/live/websocket_handlers.py
  - server/app/core/websocket.py
- 部署要求：
  - 后端需要同步代码并重启
  - 前端不需要额外更新（若前端已包含任务历史合并恢复改动）
  - 不需要数据库迁移
  - 不需要环境变量变更
- 回归重点：
  1. 白板模式完成任务后刷新页面，本节课已完成任务仍存在
  2. 教师刷新重连后，`room_info.task_history` 能恢复当前课堂已结束任务
  3. 同一节课连续完成多个任务，刷新后都能恢复
  4. server/app 执行 `py -3 -m compileall` 通过

## 2026-04-08 课堂会话与发布任务修复补充
- 范围：课堂会话、白板发布任务、白板已完成任务刷新恢复
- 前端文件：
  - client/src/pages/teacher/WhiteboardMode.tsx
  - client/src/features/whiteboard/hooks/useWhiteboardLive.ts
  - client/src/pages/teacher/ClassroomReviewDetail.tsx
- 后端文件：
  - server/app/core/websocket.py
  - server/app/api/v1/live/websocket_handlers.py
- 修复内容：
  - 白板刷新后优先恢复正在上课的班级和上次选择班级
  - room_info 新增恢复 task_history，白板刷新后可恢复本节课已完成任务
  - 教师重连时按当前 active LiveSession 从数据库回填已结束任务历史到房间内存
  - 发布任务/发布任务组时，若存在 active LiveSession，会同步写入当前 room.live_session_id，避免发布后界面仍显示“本节课未开始”
  - 白板发布任务前端增加显式校验：未开始本节课时不允许直接发布
- 部署要求：
  - 前端需要重新 build 并发布
  - 后端需要同步代码并重启
  - 不需要数据库迁移
  - 不需要环境变量变更
- 回归重点：
  1. 未开始本节课时，发布任务会提示先开始课堂
  2. 开始本节课后，发布任务学生端能正常收到
  3. 完成任务后刷新白板，本节课已完成任务仍保留
  4. 教师刷新白板后优先恢复正在上课的班级

## 2026-04-08 白板课堂状态口径统一补充
- 范围：白板模式课堂状态显示、开始/结束课堂按钮、发布任务前置校验
- 前端文件：
  - client/src/features/whiteboard/hooks/useWhiteboardLive.ts
  - client/src/pages/teacher/WhiteboardMode.tsx
  - client/src/pages/teacher/ClassroomReviewDetail.tsx
- 修复内容：
  - 白板优先按 active LiveSession 恢复当前课堂会话，不再要求 room.live_session_id 与 active session 完全一致才显示课堂进行中
  - 白板顶部课堂按钮和黄色提醒统一按 effectiveClassroomSessionId 判断，避免出现“实际在上课但按钮显示开始本节课”
  - 发布任务前置校验统一按 effectiveClassroomSessionId 判断，避免会话对象和房间状态分叉导致无法发布
  - 顺手清理课堂回顾详情页未使用变量，恢复前端编译通过
- 部署要求：
  - 前端需要重新 build 并发布
  - 后端沿用上一轮发布任务修复版本即可；若未更新上一轮后端，则需一并更新并重启
  - 不需要数据库迁移
  - 不需要环境变量变更
- 回归重点：
  1. 系统存在 active 课堂时，进入白板不再显示“开始本节课”按钮
  2. 未开始课堂时，黄色提醒条正常显示
  3. 已开始课堂后可以正常发布任务，学生端能正常收到

## 2026-04-08 课堂结束与学生端等待态收口
- 范围：结束本节课、学生端等待课堂开始、白板课堂状态单一真相源
- 前端文件：
  - client/src/features/whiteboard/hooks/useWhiteboardLive.ts
  - client/src/pages/teacher/WhiteboardMode.tsx
  - client/src/pages/student/Live.tsx
- 后端文件：
  - server/app/api/v1/live/classroom_sessions.py
- 修复内容：
  - 结束本节课改为在服务端直接关闭当前课堂房间，不再依赖单独的 WS end_session 消息竞争时序
  - 学生端在“课堂未开始”等待态下增加自动重连，教师开始本节课后可自动恢复加入
  - 白板课堂会话状态继续收口，移除旧的 endSession 残留引用，保持单一路径
- 部署要求：
  - 前端需要重新 build 并发布
  - 后端需要同步代码并重启
  - 不需要数据库迁移
  - 不需要环境变量变更
- 回归重点：
  1. 结束本节课后，学生端会退出当前课堂并回到等待状态
  2. 学生端在等待课堂开始时，教师开始本节课后可自动恢复连接
  3. 已开始本节课后可以正常发布任务，学生端能收到

## 2026-04-08 白板任务预览与发布链路修复
- 范围：白板模式任务预览、发布给学生
- 前端文件：
  - client/src/pages/teacher/WhiteboardMode.tsx
  - client/src/features/whiteboard/components/TaskPreviewCard.tsx
- 修复内容：
  - 白板任务组列表接口只返回摘要字段时，发布前会主动补拉任务组详情，避免发出空 tasks 导致整条发布链路失效
  - 任务预览卡片在切换任务组时会重置当前题目索引，避免因索引越界显示“该任务组没有题目”
- 部署要求：
  - 前端需要重新 build 并发布
  - 后端不需要更新
  - 不需要数据库迁移
  - 不需要环境变量变更
- 回归重点：
  1. 点击待发布任务后，预览卡片能正常显示题目内容
  2. 点击发布给学生后，学生端能收到任务
  3. 同一任务组多题预览切换后，再打开其他任务组不会出现 noTasks

## 2026-04-08 课堂通信全链路收口
- 范围：课堂教学主通信链路、白板发布任务、学生端提交、课堂会话绑定、通信契约文档
- 前端文件：
  - client/src/features/whiteboard/hooks/useWhiteboardLive.ts
  - client/src/pages/teacher/WhiteboardMode.tsx
  - client/src/services/websocket.ts
  - client/src/pages/student/Live.tsx
  - client/src/features/teacher-live/hooks/useTaskGroups.ts
- 后端文件：
  - server/app/api/v1/live/websocket_handlers.py
  - server/app/core/websocket.py
- 文档：
  - docs/live-communication-contract.md
- 修复内容：
  - 发布任务组改成后端按 `group_id` 查询任务组和题目，前端不再发送完整 `tasks`
  - 发布路径停止自动开课；没有 active lesson 时统一返回“请先开始本节课”
  - 房间内 `current_task_group` 和 `new_task_group` payload 补齐 `session_id/live_session_id`
  - 学生端提交任务组时显式携带 `session_id`，重复发布同一任务组到不同课堂时不再串提交
  - 白板发布动作改成等待后端 `task_group_published` 或 `error` 确认，不再把前端 `send()` 当成成功
  - 白板发布入口改成只依赖 `group_id`，不再因为预览对象或摘要对象时序变化影响实际发布
  - 新增课堂通信契约文档，后续任何通信相关修改必须先对照并更新该文档
- 部署要求：
  - 前端需要重新 build 并发布
  - 后端需要同步代码并重启
  - 不需要数据库迁移
  - 不需要环境变量变更
- 回归重点：
  1. 未开始本节课时，白板显示黄色提示条且发布任务报“请先开始本节课”
  2. 开始本节课后，白板发布任务成功，学生端能收到 `new_task_group`
  3. 学生提交后，教师端提交人数同步增加
  4. 结束本节课后，学生端退出到等待状态
  5. 刷新白板后，当前 active lesson、待发布任务预览和本节课已完成任务都能恢复
## 2026-04-08 课堂发布链路继续收口（active session 查询与错误透出）
- 修复课堂会话接口中的 active session 查询，避免同班多条 active lesson 时触发 `scalar_one_or_none()` 异常，统一按最新一条 active lesson 恢复并记录告警。
- 修复任务组提交链路里按 `LiveSession.id` / `LiveTask.session_id` 取单值时可能因多行结果抛错的问题，改为稳定取第一条有效 session。
- 白板发布任务失败时改为直接显示后端返回的真实错误消息，不再一律显示“连接错误”。
- 本轮是课堂通信契约文档的补充实现，后续通信相关改动继续参照 `docs/live-communication-contract.md`。

### 部署要求
- 前端需要重新 build 并发布
- 后端需要同步代码并重启
- 不需要数据库迁移
- 不需要环境变量变更

### 回归重点
1. 已开始本节课时，白板发布任务不再直接弹泛化“连接错误”
2. 若发布失败，前端可显示后端真实错误消息
3. 学生端能收到新发布任务
4. 学生提交任务后，教师端提交人数同步增加
## 2026-04-08 白板发布链路连接层兜底
- 白板实时连接改为支持等待 `onopen` 的连接承诺，发布任务前不再只轮询 `readyState`。
- `ws.onerror` 时强制关闭坏连接，避免连接卡在 `CONNECTING` 导致发布一直报 `WebSocket not connected`。
- 发布失败时继续透出真实后端错误消息，用于区分连接问题和课堂状态问题。

### 部署要求
- 前端需要重新 build 并发布
- 后端建议与上一轮一起重启，确保课堂通信修复全部生效

## 2026-04-08 白板任务发布与教师房间在线校验
- 范围：`/teacher/whiteboard` 白板发布任务链路、教师房间在线校验、教师端任务发布确认回推
- 前端文件：
  - client/src/features/whiteboard/hooks/useWhiteboardLive.ts
  - client/src/pages/teacher/WhiteboardMode.tsx
- 后端文件：
  - server/app/api/v1/live/task_groups.py
  - server/app/core/websocket.py
- 修复内容：
  - 白板页发布任务前先确保教师 WebSocket 已恢复连接，再调用 HTTP 发布接口
  - `getRoomInfo`、弹幕与氛围效果发送改为安全发送，不再因为瞬时 WS 关闭把成功动作误判成失败
  - 后端 HTTP 发布任务前显式校验当前教师房间存在且 `teacher_ws` 在线；不再向空房间静默发布
  - 后端 `publish_task_group` 成功后除了广播学生端，还会主动推送 `task_group_published` 给教师端，白板运行态不再依赖额外补一次 `room_info` 才更新
  - `manager.publish_task_group` 在房间缺失或教师连接缺失时改为显式抛错，便于快速定位

### 部署要求
- 前端需要重新 build 并发布
- 后端需要同步代码并重启
- 不需要数据库迁移
- 不需要环境变量变更

### 回归重点
1. `http://192.168.1.11:5173/teacher/whiteboard` 开始本节课后，点击“发布给学生”不再报 `WebSocket closed`
2. 若教师房间未建立，前端显示明确提示“课堂连接未建立，请刷新课堂教学页面后重试”
3. 发布成功后，教师端白板立即进入进行中任务状态
4. 学生端能收到 `new_task_group`

## 2026-04-08 白板任务发布 500 容错补强
- 范围：课堂房间内存状态兼容、白板任务发布广播容错
- 后端文件：
  - server/app/core/websocket.py
- 修复内容：
  - `publish_task_group` 广播前对历史房间对象做 `setdefault` 兜底，补齐：
    - `published_tasks_history`
    - `task_group_submissions`
    - `student_wss`
  - 避免旧房间对象缺键导致 HTTP 发布接口返回 500
- 部署要求：
  - 后端需要同步代码并重启
  - 必须重启，不能只依赖热更新，否则旧内存房间仍可能保留坏结构
- 回归重点：
  1. 白板页开始本节课后，点击“发布给学生”不再返回 500
  2. 学生端能收到任务

## 2026-04-08 白板 WebSocket token 预刷新修复
- 范围：`/teacher/whiteboard` 教师 WebSocket 连接鉴权、断线重连
- 前端文件：
  - client/src/features/whiteboard/hooks/useWhiteboardLive.ts
  - docs/live-communication-contract.md
- 修复内容：
  - 白板页建立或重连 WebSocket 前，先从 `localStorage` 读取最新 access token
  - access token 在 60 秒内即将过期时，先调用 `/api/v1/auth/refresh` 再连接 WebSocket
  - refresh 成功后同步更新 `localStorage` 和应用内 token
  - access token 已过期且 refresh 失败时，不再继续拿旧 token 重连，避免后台持续出现 `Invalid token` / `403`
  - 重写课堂通信契约文档，明确“HTTP 可 refresh，WS 建连前必须主动 refresh”

### 部署要求
- 前端需要重新 build 并发布
- 后端不需要因为本项单独更新
- 不需要数据库迁移
- 不需要环境变量变更

### 回归重点
1. 白板页长时间停留后，再发布任务不再出现后台 `Invalid token` 的 WebSocket 403
2. 白板页刷新或重连后，教师 WebSocket 能正常恢复
3. 开始本节课后，发布任务学生端能收到
## 2026-04-09 - 课堂通信稳定性二次收口

### 修改范围
- 修正 HTTP fallback 课堂上下文绑定
- 修正 challenge ACK 持久化语义

### 主要文件
- `server/app/api/v1/live/submissions.py`
- `server/app/api/v1/live/websocket_handlers.py`
- `client/src/services/api.ts`
- `client/src/pages/student/Live.tsx`

### 关键调整
- HTTP fallback 提交任务组时，显式传递 `class_id`，不再依赖“当前 enrollment / room 猜班级”
- HTTP fallback 任务组提交在缺少课堂上下文时明确报错，不再静默落到错误班级
- `submit_challenge` 的 ACK 调整为在数据库持久化成功后返回，避免客户端在未持久化完成时停止重试

### 部署要求
- 前端需要重发版
- 后端需要重启
- 不需要数据库迁移
- 不需要环境变量变更

### 回归重点
1. 学生端 WS 断开时，任务组提交通过 HTTP fallback 仍能落到正确班级和正确课堂会话
2. 同一任务组跨不同课堂会话提交时，不会被 HTTP fallback 误判为重复提交
3. challenge 提交只有在服务端完成持久化后才会收到 ACK
## 2026-04-09 - 课堂通信稳定性 Phase 复核补丁

### 修改范围
- 修复课堂运行态快照恢复后任务组提交计数归零
- 修复 `LiveRoomSnapshot.version` 只有自增、没有真正并发保护的问题

### 主要文件
- `server/app/core/websocket.py`

### 关键调整
- 在 room 内新增并维护 `task_group_submission_counts`
- `room_info.task_group_submission_count` 优先使用提交计数字典，不再只依赖内存 `set`
- 快照恢复时同步恢复 `task_group_submission_counts`
- `save_snapshot()` 改为带 `version` 条件的 compare-and-swap 更新，失败时自动重试

### 部署要求
- 后端需要重启
- 前端不需要更新
- 不需要数据库迁移
- 不需要环境变量变更

### 回归重点
- 教师刷新/服务重启后，当前任务组提交人数不回到 0
- 快照保存并发写入时，不再只是“version 自增”而没有实际保护
## 2026-04-09 - WS 基础设施统一第一轮

### 修改范围
- 抽离共享的 WebSocket token 刷新与 URL 构造逻辑
- 白板实时 hook 与通用 websocket hook 统一使用同一套认证工具

### 主要文件
- `client/src/services/ws-auth.ts`
- `client/src/services/websocket.ts`
- `client/src/features/whiteboard/hooks/useWhiteboardLive.ts`

### 关键调整
- 新增 `ws-auth.ts`
  - `readJwtExp()`
  - `getFreshAccessToken()`
  - `buildLiveWsUrl()`
- 白板模式建连前继续通过共享工具获取最新 access token
- 通用课堂 websocket 客户端改为复用共享 URL 构造和 HTTP refresh 逻辑

### 部署要求
- 前端需要重新 build 并发布
- 后端不需要更新
- 不需要数据库迁移
- 不需要环境变量变更

### 回归重点
- 白板模式与学生端都能正常建连
- 长课堂中 token 刷新后，普通 HTTP 与 WS 不再走两套逻辑
## 2026-04-09 - WS 基础设施统一第二轮

### 修改范围
- 通用 websocket 客户端首次建连前统一走共享 token 刷新
- 服务端 ping/pong 心跳补充活跃打点
- 关键课堂通信链路补充统一结构化日志

### 主要文件
- `client/src/services/websocket.ts`
- `client/src/services/ws-auth.ts`
- `server/app/api/v1/live/websocket_handlers.py`
- `server/app/api/v1/live/logging_utils.py`
- `server/app/api/v1/live/task_groups.py`
- `server/app/api/v1/live/submissions.py`
- `server/app/api/v1/live/classroom_sessions.py`

### 关键调整
- 通用 `useLiveWebSocket` 首次建连前改为先调用共享 `getFreshAccessToken()`
- 通用 websocket 与白板 websocket 统一使用 `buildLiveWsUrl()`
- 服务端收到 `ping` 时同步刷新 teacher/student 的 last seen
- 新增统一日志 helper `log_live_transport()`
- 关键链路开始输出统一格式日志：
  - 开始/恢复/结束本节课
  - 发布任务组
  - HTTP fallback 提交任务组
  - WS 提交任务组
  - WS 提交 challenge

### 部署要求
- 前端需要重新 build 并发布
- 后端需要重启
- 不需要数据库迁移
- 不需要环境变量变更

### 回归重点
- 学生端首次建连前 token 即将过期时仍能正常连上
- 长课堂中 ping/pong 后，zombie cleanup 不会误清理正常在线用户

## 2026-04-09 - 服务端心跳超时清理收口

### 修改范围
- 收口 `ConnectionManager` 的心跳超时判定和 stale 连接剔除
- 连接建立时立即刷新 teacher/student 活跃时间

### 主要文件
- `server/app/core/websocket.py`

### 关键调整
- `create_room()` / `join_room()` 建立连接时立即 `touch_teacher()` / `touch_student()`
- 僵尸清理不再依赖“超时后先发一个 ping 试探”，改成按 `last_seen` 超时直接剔除 stale teacher/student 连接
- 新增统一的 teacher/student stale 连接移除逻辑，并补充清理日志
- teacherless room 首次进入宽限期时记录日志，超时移除时输出明确 `idle_seconds`

### 部署要求
- 后端需要重启
- 前端不需要更新
- 不需要数据库迁移
- 不需要环境变量变更

### 回归重点
1. 正常在线 teacher/student 不会因为 cleanup 被误踢
2. 长时间静默断开的 teacher/student 会被清理，房间状态不再残留 stale 连接
3. teacher 断线 30 分钟后仍无人恢复时，teacherless room 会被自动清理

## 2026-04-09 - 关键消息 ACK / Recovery 最后一轮

### 修改范围
- 调整学生端关键提交消息的 ACK 超时处理
- ACK 超时后先查课堂状态，再决定是否补发

### 主要文件
- `client/src/services/websocket.ts`
- `client/src/pages/student/Live.tsx`

### 关键调整
- `submit_task_group` 在 ACK 超时后先请求一次 `room_info`，再决定是否继续重试
- `task_group_submission_received` 业务确认事件会直接解除对应 pending ACK
- `submit_challenge` 在 ACK 超时后先检查本地/刷新后的 challenge scoreboard；若当前学生已标记为 `submitted`，则停止重试
- 学生端 websocket 显式传入 `selfUserId`，用于按 scoreboard 判定 challenge 提交是否已被服务端接收

### 部署要求
- 前端需要重新 build 并发布
- 后端不需要更新
- 不需要数据库迁移
- 不需要环境变量变更

### 回归重点
1. 任务组提交 ACK 丢失时，不会立刻盲重试；收到 `task_group_submission_received` 后会停止重试
2. challenge 提交 ACK 超时后，如果 scoreboard 已显示当前学生 `submitted=true`，不会继续补发
3. 网络抖动时，学生端不会因为 ACK 单次丢失导致重复提交明显增加

## 2026-04-09 - 学生端弹幕覆盖结束态补丁

### 修改范围
- 修复学生端在任务结果页、抢答/PK 结束态、等待态等分支下不显示弹幕的问题

### 主要文件
- `client/src/pages/student/Live.tsx`

### 关键调整
- 抽出统一的 `classroomDanmu` 叠加层
- 将弹幕层挂到学生端主要课堂分支，包括：
  - 挑战结果页
  - 挑战观战/结束态
  - 无任务等待页
  - 整组任务结果页
  - 整组任务作答页
  - 单题结果页
  - 单题作答页

### 部署要求
- 前端需要重新 build 并发布
- 后端不需要更新
- 不需要数据库迁移
- 不需要环境变量变更

### 回归重点
1. 学生端在刚结束抢答、PK、整组任务后，仍能看到新弹幕
2. 学生端等待任务页仍能显示弹幕
3. 弹幕显示不影响原有分享层和氛围特效层

## 2026-04-09 - 教师端弹幕预制语句设置

### 修改范围
- 在课堂教学白板页的氛围设置中，增加弹幕预制语句设置
- 教师端最多可配置 5 条预制语句，学生端弹幕输入面板同步展示

### 主要文件
- `client/src/pages/teacher/WhiteboardMode.tsx`
- `client/src/pages/student/Live.tsx`
- `client/src/features/danmu/hooks/useDanmu.ts`
- `client/src/features/danmu/types/danmu.ts`
- `client/src/features/whiteboard/hooks/useWhiteboardLive.ts`
- `client/src/services/websocket.ts`
- `server/app/core/websocket.py`
- `server/app/api/v1/live/websocket_handlers.py`
- `server/app/api/v1/live/schemas.py`

### 关键调整
- 教师端氛围设置面板新增“弹幕预制语句”配置区
- 最多允许 5 条预制语句
- 预制语句进入 danmu 配置广播、课堂快照和恢复链路
- 学生端弹幕面板改为读取服务端同步下发的预制语句

### 部署要求
- 前端需要重新 build 并发布
- 后端需要同步代码并重启
- 不需要数据库迁移
- 不需要环境变量变更

### 回归重点
1. 教师端可新增、编辑、删除弹幕预制语句，最多 5 条
2. 学生端弹幕面板显示教师端配置后的预制语句
3. 教师刷新、课堂恢复后，预制语句配置仍能保留
4. 未配置自定义语句时，系统默认预制语句仍可用
