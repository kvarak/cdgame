.PHONY: build serve test clean version generate-version deploy deploy-setup publish

# Variables
IMAGE_NAME = build-flow-boardgame
DEV_IMAGE_NAME = $(IMAGE_NAME)-dev
CONTAINER_NAME = $(IMAGE_NAME)-container
DEV_CONTAINER_NAME = $(IMAGE_NAME)-dev-container

# Generate version from git
generate-version:
	@echo "Generating version from git..."
	node scripts/generate-version.js

# Build production Docker image
build: generate-version
	@echo "Building production Docker image..."
	docker build --target production -t $(IMAGE_NAME):latest .

# Build and serve development container
serve: generate-version
	@echo "Building development Docker image..."
	docker build --target development -t $(DEV_IMAGE_NAME):latest .
	@echo "Starting development container..."
	docker run -it --rm \
		--name $(DEV_CONTAINER_NAME) \
		--network=host \
		-v $(PWD):/app \
		-v /app/node_modules \
		$(DEV_IMAGE_NAME):latest

# Run tests in container
test:
	@echo "Building test image and running tests..."
	docker build --target builder -t $(IMAGE_NAME)-test:latest .
	docker run --rm \
		--name $(IMAGE_NAME)-test-container \
		$(IMAGE_NAME)-test:latest \
		npm run test

# Clean up Docker images and containers
clean:
	@echo "Cleaning up Docker resources..."
	-docker stop $(CONTAINER_NAME) $(DEV_CONTAINER_NAME) 2>/dev/null || true
	-docker rm $(CONTAINER_NAME) $(DEV_CONTAINER_NAME) 2>/dev/null || true
	-docker rmi $(IMAGE_NAME):latest $(DEV_IMAGE_NAME):latest $(IMAGE_NAME)-test:latest 2>/dev/null || true

# Run production container
run-prod:
	@echo "Running production container..."
	docker run -d \
		--name $(CONTAINER_NAME) \
		-p 80:80 \
		$(IMAGE_NAME):latest

# Stop production container
stop-prod:
	@echo "Stopping production container..."
	-docker stop $(CONTAINER_NAME)
	-docker rm $(CONTAINER_NAME)

# Setup deployment configuration
deploy-setup:
	@echo "Setting up automated deployment..."
	@echo "1. Connect to GitHub in Lovable (GitHub → Connect to GitHub)"
	@echo "2. Add deployment secrets to GitHub repository settings:"
	@echo "   Settings → Secrets and variables → Actions → New repository secret"
	@echo ""
	@echo "For Vercel deployment:"
	@echo "   - VERCEL_TOKEN (from vercel.com/account/tokens)"
	@echo "   - ORG_ID (from vercel.com/[team]/settings)"
	@echo "   - PROJECT_ID (from your project settings)"
	@echo ""
	@echo "For Netlify deployment:"
	@echo "   - NETLIFY_SITE_ID (from site settings)"
	@echo "   - NETLIFY_AUTH_TOKEN (from user settings → personal access tokens)"
	@echo ""
	@echo "3. Push changes to main branch to trigger deployment"

# Deploy via GitHub Actions (automated publish)
deploy: generate-version
	@echo "Triggering automated deployment..."
	@echo "Current branch: $$(git branch --show-current 2>/dev/null || echo 'not-a-git-repo')"
	@if [ ! -d .git ]; then \
		echo "Error: Not a git repository. Connect to GitHub first in Lovable."; \
		exit 1; \
	fi
	@if [ "$$(git status --porcelain)" ]; then \
		echo "Committing local changes..."; \
		git add .; \
		git commit -m "Deploy: $$(date '+%Y-%m-%d %H:%M:%S')"; \
	fi
	@echo "Pushing to main branch to trigger deployment..."
	git push origin main
	@echo "✓ Deployment triggered! Check GitHub Actions tab for status."
	@echo "  View at: https://github.com/$$(git config --get remote.origin.url | sed 's/.*github.com[:/]\\([^.]*\\).*/\\1/')/actions"

# Alias for deploy (publish functionality)
publish: deploy

# Stop production container

# Show help
help:
	@echo "Available commands:"
	@echo ""
	@echo "Development:"
	@echo "  make generate-version - Generate version from git describe"
	@echo "  make build           - Build production Docker image"
	@echo "  make serve           - Build and run development container"
	@echo "  make test            - Run tests in container"
	@echo ""
	@echo "Production:"
	@echo "  make run-prod        - Run production container"
	@echo "  make stop-prod       - Stop production container"
	@echo ""
	@echo "Deployment:"
	@echo "  make deploy-setup    - Setup automated deployment configuration"
	@echo "  make deploy          - Deploy via GitHub Actions (automated)"
	@echo "  make publish         - Alias for deploy (publish to production)"
	@echo ""
	@echo "Maintenance:"
	@echo "  make clean           - Clean up Docker resources"
	@echo "  make help            - Show this help message"