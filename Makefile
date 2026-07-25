.PHONY: api web test docker

api:
	cd backend && uvicorn app.main:app --reload --port 8000

web:
	cd frontend && npm run dev

test:
	cd backend && pytest -q

docker:
	docker compose up --build
