.PHONY: setup dev build lint test db-generate db-migrate db-push db-studio clean

# Setup project
setup:
	npm install
	mkdir -p data
	npm run db:generate
	npm run db:migrate

# Development
dev:
	npm run dev

# Build
build:
	npm run build

# Lint
lint:
	npm run lint

# Test
test:
	npm test

# Database commands
db-generate:
	npx drizzle-kit generate

db-migrate:
	npx drizzle-kit migrate

db-push:
	npx drizzle-kit push

db-studio:
	npx drizzle-kit studio

# Clean
clean:
	rm -rf .next node_modules data/*.db
