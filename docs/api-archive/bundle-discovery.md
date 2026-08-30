# Public bundle discovery appendix

공개 RequireJS 번들을 정적으로 검색한 결과다. 이 목록은 URL 문자열의 존재를
뜻할 뿐, 현재 계정에서 실제 사용 가능하거나 호출이 안전하다는 뜻이 아니다.
메서드와 selector가 명확한 핵심 항목만 `endpoints.json`에 승격했다.

## PLATO

| AMD module | 발견 경로 |
|---|---|
| `theme_coursemos/index/dashboard` | `/local/ubion/dashboard/action.php` |
| `theme_coursemos/darkmode`, `theme_coursemos/loader` | `/theme/coursemos/action.php` |
| `local_ubnotification/drawers` | `/local/ubnotification/action.php` |
| `local_talk/file`, `local_talk/index` | `/local/talk/action.php` |
| `local_ubassistant/index` | `/local/ubassistant/action.php` |
| `local_aihub/index` | `/local/aihub/signature.php` |
| `local_aimodule/index` | `/local/aimodule/action.php` |
| `local_ubeclass/request` | `/local/ubencourage/action.php` |
| `local_ubion/course/transfer` | `/local/ubion/course/transferAction.php` |
| `local_ubion/mod/assign` | `/local/ubion/mod/assign/best.php` |
| `local_ubion/socket.io` | `/local/ubmenu/action.php` |
| `local_ubsmartbook/index` | `/local/ubsmartbook/action.php` |
| `local_ubveluga/veluga` | `/local/ubveluga/action.php`, `/local/ubveluga/chat.php` |
| `mod_ubboard/article`, `comment`, `manager`, `tracking` | `/mod/ubboard/action.php` |
| `mod_ubboard/category`, `list` | `/mod/ubboard/view.php` |
| `mod_econtents/progress` | `/mod/econtents/action.php` |
| `mod_vod/progress` | `/mod/vod/action.php` |
| `mod_vod/ai` | `/mod/vod/aiAction.php` |
| `mod_vod/auto-subtitle` | `/mod/vod/autoSubtitleAction.php`, `/mod/vod/categoryAction.php` |
| `mod_vod/tree` | `/mod/vod/categoryAction.php` |
| `mod_workshop/workshopview` | `/mod/xncommons/action.php`, `/mod/xncommons/blank.php`, `/mod/xncommons/cmsget.php` |
| `mod_laby/laby` | `/mod/laby/blank.php`, `/mod/laby/cmsget.php` |
| `core_h5p/repository`, `tiny_autosave/repository` | `/lib/ajax/service.php` |
| `block_navigation/nav_loader` | `/lib/ajax/getnavbranch.php` |
| `block_navigation/site_admin_loader` | `/lib/ajax/getsiteadminbranch.php` |
| `editor_tiny/uploader` | `/repository/repository_ajax.php?action=upload` |
| `repository_googledocs/upload` | `/repository/googledocs/repository_ajax.php` |
| `message_popup/notification_popover_controller` | `/message/output/popup/notifications.php` |
| `tiny_media/manager` | `/lib/editor/tiny/plugins/media/manage.php` |
| `quizaccess_seb/validate_quiz_access` | `/mod/quiz/accessrule/seb/config.php` |
| `local_manager/site/lang/index` | `/local/manager/modules/site/lang/excel_all_.php` |

### 신 알림 drawer 조회 계약

`local_ubnotification/drawers`는 알림 목록을 GET 문서에서 긁지 않고 아래의
읽기 전용 action을 호출한다. 전송 방식은 POST지만 `lists`는 서버 상태를
변경하지 않는다. 확장 프로그램은 페이지에 이미 렌더링된 알림을 우선 사용하고,
사용자가 알림 패널의 새로고침 버튼을 직접 누른 경우에만 이 요청을 보낸다.

- 경로: `POST /local/ubnotification/action.php`
- FormData: `coursemostype=lists`, `courseid=0`, `page=1`, `sesskey=<현재 세션>`
- 헤더: `X-Requested-With: XMLHttpRequest`
- 성공: `code=100`; `html`에 `.notification-item` 목록 조각, `count`에 목록 수
- 주요 응답 선택자: `.notification-item-header`, `.header-title`,
  `.header-date`, `.notification-item-body`

같은 controller의 `delete`, `deleteAll`은 쓰기 action이다. 확장 프로그램은
두 action을 호출하거나 해당 버튼을 재노출하지 않는다.

`local_talk`, 게시판, 강좌 신청, 테마·사용자 환경설정 모듈에서 발견한
글쓰기·댓글·메시지 발송, 파일 업로드, 삭제, 신청·취소 및 설정 변경 action은
경로를 문서화할 뿐 탐색기와 확장 프로그램에서 호출하지 않는다.

## 구 PLATO

| AMD module | 발견 경로 |
|---|---|
| `core_user/users`, `local_ubion/user` | `/local/ubion/user/action.php`, `/theme/coursemosv2/action.php` |
| `theme_coursemosv2/coursemos` | `/theme/coursemosv2/action.php` |
| `local_ubonline/online` | `/local/ubonline/action.php` |
| `local_ubteaching/online` | `/local/ubteaching/action.php` |
| `local_ubeclass/eclass` | `/local/ubeclass/my.php` |
| `mod_ubboard/ubboard` | `/mod/ubboard/ajax.php` |
| `mod_vod/vod` | `/mod/vod/action.php` |
| `local_ubion/assign` | `/local/ubion/mod/assign/addcomment.php`, `/local/ubion/mod/assign/best.php`, `/local/ubion/mod/assign/best_view.php`, `/local/ubion/mod/assign/savecomment.php` |
| `local_ubion/finalGrade` | `/local/ubion/setting/grade/finalgrade.php` |
| `local_ubveluga/veluga` | `/local/ubveluga/chat.php` |
| `mod_ubpeer/ubpeer` | `/mod/ubpeer/result_popup.php`, `/mod/ubpeer/status_popup.php` |
| `block_navigation/nav_loader` | `/lib/ajax/getnavbranch.php` |
| `block_navigation/site_admin_loader` | `/lib/ajax/getsiteadminbranch.php` |
| `message_popup/message_popover_controller` | `/message/index.php` |
| `message_popup/notification_popover_controller` | `/message/output/popup/notifications.php` |

## 재현

```powershell
node scripts/discover-api-bundles.mjs
```

탐색기는 GET만 사용하고 결과를 표준 출력으로 내보낸다. minified 코드의
`type="button"` 같은 UI 속성이 action으로 오인될 수 있으므로 자동 결과는
반드시 사람이 검토해야 한다.
