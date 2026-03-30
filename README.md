**로컬로 실행**

1. 종속성 설치:
   'npm install'
2. 앱 실행:
   'npm run dev'
3. 추가 install
   'npm install sonner motion lucide-react'

원격 저장소의 특정 브랜치(예: main) 코드로 내 로컬 코드를 싹 다 밀어버리고 싶을 때 아래 두 줄을 차례대로 입력합니다.

1. 원격 저장소의 최신 정보 가져오기 (적용은 안 함)

Bash

git fetch origin
이 명령어는 GitHub에 있는 최신 코드 내역을 내 컴퓨터로 다운로드만 하고, 당장 내 파일들을 바꾸지는 않는 안전한 명령어입니다.

2. 다운받은 코드로 로컬 상태 강제 덮어쓰기

Bash

git reset --hard origin/main
아까 8273e43 커밋으로 돌아갈 때 쓰셨던 그 강력한 reset --hard를 여기서 다시 씁니다!

"방금 다운받은 원격 저장소(origin)의 main 브랜치 상태로 내 컴퓨터를 완벽하게 초기화해 줘!"라는 뜻입니다. (만약 다른 브랜치라면 main 대신 그 브랜치 이름을 적으시면 됩니다.)
