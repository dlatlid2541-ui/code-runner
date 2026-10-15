# CODE RUNNERS (코드 러너즈)

바이브 코딩 실습용 **3레인 무한 러닝** 웹 게임입니다.  
캐릭터 **삐야(Ppiya)** / **오르(Oru)** 를 선택해 바이러스를 피하고 백신·코인을 수집합니다.

## 실행 방법

1. 이 폴더의 **`index.html`** 을 더블클릭해 브라우저(Chrome / Edge 권장)에서 엽니다.
2. 별도 서버 설치 없이 동작합니다. (캐릭터·오디오 파일은 `index.html` 과 같은 폴더에 있어야 합니다.)

## 조작

| 입력 | 동작 |
|------|------|
| ← / A, → / D | 레인 이동 |
| ↑ / Space | 점프 |
| Esc / ⏸ | 일시정지 |
| 🔊 | 음소거 |

## 폴더 구성

- `index.html` — 게임 화면
- `css/game.css` — UI·레이아웃
- `js/game.js` — 게임 로직
- `js/audio.js` — BGM·효과음
- `audio/` — 배경음·효과음 파일
- `assets/entities/` — 바이러스·백신·코인 이미지
- `ppiya_*.png`, `oru_*.png` — 캐릭터 스프라이트

## 사운드 라이선스

- BGM: Kenney Music Loops (CC0)
- 효과음: Kenney Interface Sounds (CC0), sfxmint ready-coin-05 (CC0)

## 그래픽 라이선스 (CC0)

- `assets/entities/coin.png` — Kenney, [Generic Items](https://opengameart.org/content/generic-items)
- `assets/entities/vaccine.png` — Kenney, [Generic Items](https://opengameart.org/content/generic-items)
- `assets/entities/virus.png` — TeeKay, [Virus, various colors](https://opengameart.org/content/virus-various-colors)

자세한 출처는 `assets/entities/CREDITS.txt` 를 참고하세요.
