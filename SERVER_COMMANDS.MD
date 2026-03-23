
# SERVER_COMMANDS.md

# מערכת יוגב — פקודות שרת שימושיות

מסמך זה מרכז את כל הפקודות החשובות לתפעול השרת, Docker, לוגים, DB, Prisma ו-debugging.

---

## 1. התחברות לשרת

```bash
ssh root@YOUR_SERVER_IP
prisma
 | Command                | Use                        |
  |------------------------|----------------------------|
  | npm run prisma:migrate | Create new migration (dev) |
  | npm run prisma:studio  | Open DB GUI                |
  | npm run db:reset       | Reset local DB completely  |
  | npm run db:sync        | Force sync schema to DB    |

חשוב לזכור כל פעם שיש שינוי ב דאטה בייס להריץ בשרת docker compose exec backend npx prisma db push & docker compose restart backend

2. מעבר לפרויקט



cd ~/yogev-system/miluim


3. Docker — פקודות בסיסיות
לראות containers רצים

docker ps

לראות גם containers שלא רצים

docker ps -a

לראות images

docker images

להרים את כל המערכת

cd ~/yogev-system/miluim
docker compose up -d

להרים עם build מחדש

cd ~/yogev-system/miluim
docker compose up -d --build

לעצור הכל

cd ~/yogev-system/miluim
docker compose down

לעצור הכל כולל volumes של DB

cd ~/yogev-system/miluim
docker compose down -v

לבנות רק backend

cd ~/yogev-system/miluim
docker compose build backend --no-cache

לבנות רק frontend

cd ~/yogev-system/miluim
docker compose build frontend --no-cache

להרים רק postgres

cd ~/yogev-system/miluim
docker compose up -d postgres

להפעיל מחדש container ספציפי

docker restart yogev-backend
docker restart yogev-frontend
docker restart yogev-nginx
docker restart yogev-postgres

לעצור container ספציפי

docker stop yogev-backend
docker stop yogev-frontend
docker stop yogev-nginx
docker stop yogev-postgres


4. לוגים
לוגים של כל המערכת

cd ~/yogev-system/miluim
docker compose logs --tail 200

לוגים חיים של כל המערכת

cd ~/yogev-system/miluim
docker compose logs -f

לוגים של backend

docker logs yogev-backend --tail 200

לוגים חיים של backend

docker logs -f yogev-backend

לוגים של frontend

docker logs yogev-frontend --tail 200

לוגים חיים של frontend

docker logs -f yogev-frontend

לוגים של nginx

docker logs yogev-nginx --tail 200

לוגים חיים של nginx

docker logs -f yogev-nginx

לוגים של postgres

docker logs yogev-postgres --tail 200

לוגים חיים של postgres

docker logs -f yogev-postgres


5. כניסה ל-container
backend

docker exec -it yogev-backend sh

frontend

docker exec -it yogev-frontend sh

postgres container shell

docker exec -it yogev-postgres sh


6. בדיקות בריאות
health של backend מתוך השרת

curl http://localhost/api/health

health של backend מתוך ה-container

docker exec -it yogev-backend sh -c "wget -qO- http://localhost:3001/api/health"

health של nginx

curl http://localhost


7. Environment Variables
לראות env בתוך backend

docker exec -it yogev-backend printenv

לראות DATABASE_URL

docker exec -it yogev-backend sh -c "printenv DATABASE_URL"

לערוך .env

cd ~/yogev-system/miluim
nano .env


8. Prisma
לבדוק מצב migrations

docker exec -it yogev-backend npx prisma migrate status

validate schema

docker exec -it yogev-backend npx prisma validate

Prisma Studio

docker exec -it yogev-backend npx prisma studio --hostname 0.0.0.0 --port 5555

ליצור bcrypt hash

docker exec -it yogev-backend node -e 'console.log(require("bcrypt").hashSync("Admin123", 10))'


9. כניסה ל-Postgres
כניסה אינטראקטיבית

docker exec -it yogev-postgres psql -U yogev -d yogev_db

יציאה מ-psql

\q


10. פקודות DB בסיסיות
לראות טבלאות

\dt

לראות מבנה טבלה

\d users
\d messages
\d shift_posts
\d zones
\d tasks
\d shift_assignments

לראות שורות מטבלאות

SELECT * FROM users LIMIT 20;
SELECT * FROM messages LIMIT 20;
SELECT * FROM shift_posts LIMIT 20;
SELECT * FROM shift_schedules LIMIT 20;
SELECT * FROM shift_assignments LIMIT 20;
SELECT * FROM skills LIMIT 20;
SELECT * FROM soldier_skills LIMIT 20;
SELECT * FROM zones LIMIT 20;
SELECT * FROM tasks LIMIT 20;
SELECT * FROM task_requirements LIMIT 20;
SELECT * FROM form_submissions LIMIT 20;
SELECT * FROM leave_requests LIMIT 20;
SELECT * FROM notifications LIMIT 20;
SELECT * FROM recommendations LIMIT 20;
SELECT * FROM social_posts LIMIT 20;

לספור שורות

SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM messages;
SELECT COUNT(*) FROM shift_posts;
SELECT COUNT(*) FROM tasks;
SELECT COUNT(*) FROM zones;
SELECT COUNT(*) FROM form_submissions;

למיין לפי תאריך

SELECT * FROM messages ORDER BY "createdAt" DESC LIMIT 20;
SELECT * FROM shift_posts ORDER BY "createdAt" DESC LIMIT 20;
SELECT * FROM notifications ORDER BY "createdAt" DESC LIMIT 20;

לחפש משתמש לפי מספר אישי ישן/חדש

SELECT * FROM users WHERE "armyNumber" = '1234567';
SELECT * FROM users WHERE "personalId" = '1234567';

לראות רק עמודות מסוימות

SELECT id, "fullName", email, phone, role, "armyNumber" FROM users;
SELECT id, title, type, "createdAt" FROM messages;


11. פקודות DB ישירות בלי להיכנס ל-psql
לראות משתמשים

docker exec -it yogev-postgres psql -U yogev -d yogev_db -c 'SELECT * FROM users LIMIT 20;'

לראות הודעות

docker exec -it yogev-postgres psql -U yogev -d yogev_db -c 'SELECT * FROM messages LIMIT 20;'

לראות שיבוצים

docker exec -it yogev-postgres psql -U yogev -d yogev_db -c 'SELECT * FROM shift_posts LIMIT 20;'

לראות משימות

docker exec -it yogev-postgres psql -U yogev -d yogev_db -c 'SELECT * FROM tasks LIMIT 20;'

לספור משתמשים

docker exec -it yogev-postgres psql -U yogev -d yogev_db -c 'SELECT COUNT(*) FROM users;'


12. יצירת משתמש אדמין ידנית
קודם יוצרים bcrypt hash

docker exec -it yogev-backend node -e 'console.log(require("bcrypt").hashSync("Admin123", 10))'

ואז מכניסים user

INSERT INTO users (
  "id",
  "fullName",
  email,
  phone,
  "passwordHash",
  role,
  "armyNumber",
  "idNumber",
  "dailyJob",
  city,
  "fieldOfStudy",
  "birthDay",
  "isActive",
  "createdAt",
  "updatedAt"
)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  'ניר סבן',
  'nir@example.com',
  '0501234567',
  'PUT_HASH_HERE',
  'ADMIN',
  '1234567',
  '123456789',
  NULL,
  NULL,
  NULL,
  NULL,
  true,
  NOW(),
  NOW()
);

לבדוק שהמשתמש נכנס

SELECT id, "fullName", email, phone, role, "armyNumber", "isActive" FROM users;


13. Git / עדכון קוד
pull מה-GitHub

cd ~/yogev-system/miluim
git pull

build + deploy מחדש

cd ~/yogev-system/miluim
docker compose up -d --build


14. קבצים חשובים
docker compose

nano ~/yogev-system/miluim/docker-compose.yml

nginx config

nano ~/yogev-system/miluim/nginx/nginx.conf

backend entrypoint

nano ~/yogev-system/miluim/backend/docker-entrypoint.sh

backend Dockerfile

nano ~/yogev-system/miluim/backend/Dockerfile

frontend Dockerfile

nano ~/yogev-system/miluim/frontend/Dockerfile

Prisma schema

nano ~/yogev-system/miluim/backend/prisma/schema.prisma


15. רשת ופורטים
לראות פורטים פתוחים

ss -tulpn

לראות מי מאזין לפורט

lsof -i :80
lsof -i :443
lsof -i :3001
lsof -i :3000

firewall

ufw status

לפתוח HTTP/HTTPS

ufw allow 80
ufw allow 443


16. גישה חיצונית
דרך IP

http://YOUR_SERVER_IP

דרך דומיין

http://YOUR_DOMAIN
https://YOUR_DOMAIN


17. גיבוי DB
export dump

docker exec -t yogev-postgres pg_dump -U yogev -d yogev_db > backup.sql

restore dump

cat backup.sql | docker exec -i yogev-postgres psql -U yogev -d yogev_db


18. reset מלא של המערכת
⚠️ מוחק גם את DB volume

cd ~/yogev-system/miluim
docker compose down -v
docker compose up -d --build


19. בדיקות מהירות הכי שימושיות

docker ps
docker logs -f yogev-backend
docker logs -f yogev-frontend
docker logs -f yogev-nginx
docker logs -f yogev-postgres
docker exec -it yogev-postgres psql -U yogev -d yogev_db
docker exec -it yogev-backend npx prisma migrate status
curl http://localhost/api/health


20. SSH tunnel ל-Prisma Studio
בשרת

docker exec -it yogev-backend npx prisma studio --hostname 0.0.0.0 --port 5555

מהמחשב שלך

ssh -L 5555:localhost:5555 root@YOUR_SERVER_IP

ואז בדפדפן

http://localhost:5555







