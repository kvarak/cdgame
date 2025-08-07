.PHONY: build serve test clean

# Variables
IMAGE_NAME = build-flow-boardgame
DEV_IMAGE_NAME = $(IMAGE_NAME)-dev
CONTAINER_NAME = $(IMAGE_NAME)-container
DEV_CONTAINER_NAME = $(IMAGE_NAME)-dev-container

# Build production Docker image
build:
	@echo "Building production Docker image..."
	docker build --target production -t $(IMAGE_NAME):latest .

# Build and serve development container
serve:
	@echo "Building development Docker image..."
	docker build --target development -t $(DEV_IMAGE_NAME):latest .
	@echo "Starting development container..."
	docker run -it --rm \
		--name $(DEV_CONTAINER_NAME) \
		-p 8080:8080 \
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

# Show help
help:
	@echo "Available commands:"
	@echo "  make build     - Build production Docker image"
	@echo "  make serve     - Build and run development container"
	@echo "  make test      - Run tests in container"
	@echo "  make run-prod  - Run production container"
	@echo "  make stop-prod - Stop production container"
	@echo "  make clean     - Clean up Docker resources"
	@echo "  make help      - Show this help message"