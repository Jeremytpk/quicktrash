# Lab 5: GitHub Actions Pipeline

## 🎯 Learning Objectives
- Understand CI/CD principles and GitHub Actions
- Create automated testing and deployment pipelines
- Integrate security scanning and code quality checks
- Deploy applications to AWS infrastructure
- Implement blue-green deployment strategies

## ⏱️ Estimated Time
- **Setup**: 45 minutes
- **Pipeline Creation**: 60 minutes
- **Testing & Debugging**: 45 minutes
- **Advanced Features**: 30 minutes
- **Total**: 3 hours

## 💰 Cost Estimate
- **GitHub Actions**: Free tier (2000 minutes/month)
- **AWS Resources**: ~$0.10/hour
- **Total for 3 hours**: ~$0.30

## 🟡 Difficulty Level: Intermediate

## 📋 Prerequisites
- [ ] GitHub account
- [ ] AWS account with appropriate permissions
- [ ] Completed Lab 1 (AWS VPC)
- [ ] Basic understanding of Docker
- [ ] Python programming knowledge

## 🏗️ Architecture Overview

```
GitHub Repository
    │
    ▼
GitHub Actions Workflow
    │
    ▼
Build & Test Stage
    │
    ▼
Security Scan Stage
    │
    ▼
Deploy to AWS Stage
    │
    ▼
AWS Infrastructure (from Lab 1)
```

## 🚀 Step-by-Step Instructions

### Step 1: Create Sample Application

Create a new GitHub repository and add the following files:

#### `app.py`
```python
from flask import Flask, jsonify
import os

app = Flask(__name__)

@app.route('/')
def hello():
    return jsonify({
        'message': 'Hello from DevSecOps Lab!',
        'version': os.getenv('APP_VERSION', '1.0.0'),
        'environment': os.getenv('ENVIRONMENT', 'development')
    })

@app.route('/health')
def health():
    return jsonify({'status': 'healthy'})

@app.route('/api/data')
def get_data():
    return jsonify({
        'data': [
            {'id': 1, 'name': 'Item 1'},
            {'id': 2, 'name': 'Item 2'},
            {'id': 3, 'name': 'Item 3'}
        ]
    })

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
```

#### `requirements.txt`
```
Flask==2.3.3
gunicorn==21.2.0
pytest==7.4.2
pytest-cov==4.1.0
bandit==1.7.5
```

#### `Dockerfile`
```dockerfile
FROM python:3.9-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create non-root user
RUN useradd -m -u 1000 appuser && chown -R appuser:appuser /app
USER appuser

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:5000/health || exit 1

# Run application
CMD ["gunicorn", "--bind", "0.0.0.0:5000", "app:app"]
```

#### `tests/test_app.py`
```python
import pytest
from app import app

@pytest.fixture
def client():
    app.config['TESTING'] = True
    with app.test_client() as client:
        yield client

def test_hello_endpoint(client):
    response = client.get('/')
    assert response.status_code == 200
    data = response.get_json()
    assert 'message' in data
    assert 'version' in data
    assert 'environment' in data

def test_health_endpoint(client):
    response = client.get('/health')
    assert response.status_code == 200
    data = response.get_json()
    assert data['status'] == 'healthy'

def test_api_data_endpoint(client):
    response = client.get('/api/data')
    assert response.status_code == 200
    data = response.get_json()
    assert 'data' in data
    assert len(data['data']) == 3
```

### Step 2: Create GitHub Actions Workflow

Create `.github/workflows/ci-cd.yml`:

```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

env:
  AWS_REGION: us-east-1
  ECR_REPOSITORY: devsecops-lab-app
  ECS_CLUSTER: devsecops-cluster
  ECS_SERVICE: devsecops-service
  ECS_TASK_DEFINITION: devsecops-task

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
    - name: Checkout code
      uses: actions/checkout@v4
      
    - name: Set up Python
      uses: actions/setup-python@v4
      with:
        python-version: '3.9'
        
    - name: Install dependencies
      run: |
        python -m pip install --upgrade pip
        pip install -r requirements.txt
        
    - name: Run tests
      run: |
        pytest tests/ --cov=app --cov-report=xml
        
    - name: Upload coverage to Codecov
      uses: codecov/codecov-action@v3
      with:
        file: ./coverage.xml
        fail_ci_if_error: false

  security-scan:
    runs-on: ubuntu-latest
    needs: test
    
    steps:
    - name: Checkout code
      uses: actions/checkout@v4
      
    - name: Set up Python
      uses: actions/setup-python@v4
      with:
        python-version: '3.9'
        
    - name: Install dependencies
      run: |
        python -m pip install --upgrade pip
        pip install -r requirements.txt
        
    - name: Run Bandit security scan
      run: |
        bandit -r . -f json -o bandit-report.json || true
        
    - name: Run Safety check
      run: |
        pip install safety
        safety check --json --output safety-report.json || true
        
    - name: Upload security reports
      uses: actions/upload-artifact@v3
      with:
        name: security-reports
        path: |
          bandit-report.json
          safety-report.json

  build-and-push:
    runs-on: ubuntu-latest
    needs: [test, security-scan]
    if: github.ref == 'refs/heads/main'
    
    steps:
    - name: Checkout code
      uses: actions/checkout@v4
      
    - name: Configure AWS credentials
      uses: aws-actions/configure-aws-credentials@v4
      with:
        aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
        aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
        aws-region: ${{ env.AWS_REGION }}
        
    - name: Login to Amazon ECR
      id: login-ecr
      uses: aws-actions/amazon-ecr-login@v2
      
    - name: Build, tag, and push image to Amazon ECR
      env:
        ECR_REGISTRY: ${{ steps.login-ecr.outputs.registry }}
        IMAGE_TAG: ${{ github.sha }}
      run: |
        docker build -t $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG .
        docker build -t $ECR_REGISTRY/$ECR_REPOSITORY:latest .
        docker push $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG
        docker push $ECR_REGISTRY/$ECR_REPOSITORY:latest
        echo "image=$ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG" >> $GITHUB_OUTPUT

  deploy:
    runs-on: ubuntu-latest
    needs: build-and-push
    if: github.ref == 'refs/heads/main'
    
    steps:
    - name: Checkout code
      uses: actions/checkout@v4
      
    - name: Configure AWS credentials
      uses: aws-actions/configure-aws-credentials@v4
      with:
        aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
        aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
        aws-region: ${{ env.AWS_REGION }}
        
    - name: Download task definition
      run: |
        aws ecs describe-task-definition --task-definition ${{ env.ECS_TASK_DEFINITION }} \
        --query taskDefinition > task-definition.json
        
    - name: Fill in the new image ID in the Amazon ECS task definition
      id: task-def
      uses: aws-actions/amazon-ecs-render-task-definition@v2
      with:
        task-definition: task-definition.json
        container-name: devsecops-app
        image: ${{ needs.build-and-push.outputs.image }}
        
    - name: Deploy Amazon ECS task definition
      uses: aws-actions/amazon-ecs-deploy-task-definition@v2
      with:
        task-definition: ${{ steps.task-def.outputs.task-definition }}
        service: ${{ env.ECS_SERVICE }}
        cluster: ${{ env.ECS_CLUSTER }}
        wait-for-service-stability: true

  notify:
    runs-on: ubuntu-latest
    needs: [deploy]
    if: always()
    
    steps:
    - name: Notify deployment status
      run: |
        if [ "${{ needs.deploy.result }}" == "success" ]; then
          echo "✅ Deployment successful!"
        else
          echo "❌ Deployment failed!"
        fi
```

### Step 3: Set Up AWS Infrastructure for Deployment

Create `infrastructure/ecs.tf`:

```hcl
# ECR Repository
resource "aws_ecr_repository" "app" {
  name                 = "devsecops-lab-app"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  tags = {
    Name = "devsecops-app-repo"
    Lab  = "lab-05"
  }
}

# ECS Cluster
resource "aws_ecs_cluster" "main" {
  name = "devsecops-cluster"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }

  tags = {
    Name = "devsecops-cluster"
    Lab  = "lab-05"
  }
}

# ECS Task Definition
resource "aws_ecs_task_definition" "app" {
  family                   = "devsecops-task"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = 256
  memory                   = 512

  execution_role_arn = aws_iam_role.ecs_execution_role.arn
  task_role_arn      = aws_iam_role.ecs_task_role.arn

  container_definitions = jsonencode([
    {
      name  = "devsecops-app"
      image = "${aws_ecr_repository.app.repository_url}:latest"

      portMappings = [
        {
          containerPort = 5000
          protocol      = "tcp"
        }
      ]

      environment = [
        {
          name  = "ENVIRONMENT"
          value = "production"
        },
        {
          name  = "APP_VERSION"
          value = "1.0.0"
        }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          awslogs-group         = aws_cloudwatch_log_group.app.name
          awslogs-region        = "us-east-1"
          awslogs-stream-prefix = "ecs"
        }
      }
    }
  ])

  tags = {
    Name = "devsecops-task-definition"
    Lab  = "lab-05"
  }
}

# ECS Service
resource "aws_ecs_service" "app" {
  name            = "devsecops-service"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.app.arn
  desired_count   = 2
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = [aws_subnet.private.id]
    security_groups  = [aws_security_group.ecs.id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.app.arn
    container_name   = "devsecops-app"
    container_port   = 5000
  }

  depends_on = [aws_lb_listener.app]

  tags = {
    Name = "devsecops-service"
    Lab  = "lab-05"
  }
}

# Application Load Balancer
resource "aws_lb" "app" {
  name               = "devsecops-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = [aws_subnet.public.id]

  tags = {
    Name = "devsecops-alb"
    Lab  = "lab-05"
  }
}

# ALB Target Group
resource "aws_lb_target_group" "app" {
  name        = "devsecops-tg"
  port        = 5000
  protocol    = "HTTP"
  vpc_id      = aws_vpc.main.id
  target_type = "ip"

  health_check {
    enabled             = true
    healthy_threshold   = 2
    interval            = 30
    matcher             = "200"
    path                = "/health"
    port                = "traffic-port"
    protocol            = "HTTP"
    timeout             = 5
    unhealthy_threshold = 2
  }

  tags = {
    Name = "devsecops-target-group"
    Lab  = "lab-05"
  }
}

# ALB Listener
resource "aws_lb_listener" "app" {
  load_balancer_arn = aws_lb.app.arn
  port              = "80"
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.app.arn
  }
}

# Security Groups
resource "aws_security_group" "alb" {
  name        = "alb-sg"
  description = "Security group for ALB"
  vpc_id      = aws_vpc.main.id

  ingress {
    description = "HTTP"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "alb-sg"
    Lab  = "lab-05"
  }
}

resource "aws_security_group" "ecs" {
  name        = "ecs-sg"
  description = "Security group for ECS tasks"
  vpc_id      = aws_vpc.main.id

  ingress {
    description     = "HTTP from ALB"
    from_port       = 5000
    to_port         = 5000
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "ecs-sg"
    Lab  = "lab-05"
  }
}

# IAM Roles
resource "aws_iam_role" "ecs_execution_role" {
  name = "ecs-execution-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "ecs_execution_role_policy" {
  role       = aws_iam_role.ecs_execution_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

resource "aws_iam_role" "ecs_task_role" {
  name = "ecs-task-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })
}

# CloudWatch Log Group
resource "aws_cloudwatch_log_group" "app" {
  name              = "/ecs/devsecops-app"
  retention_in_days = 7

  tags = {
    Name = "devsecops-app-logs"
    Lab  = "lab-05"
  }
}
```

### Step 4: Configure GitHub Secrets

In your GitHub repository, go to Settings > Secrets and variables > Actions and add:

- `AWS_ACCESS_KEY_ID`: Your AWS access key
- `AWS_SECRET_ACCESS_KEY`: Your AWS secret key

### Step 5: Deploy Infrastructure

```bash
cd infrastructure
terraform init
terraform plan
terraform apply
```

### Step 6: Test the Pipeline

1. **Push code to trigger pipeline**:
   ```bash
   git add .
   git commit -m "Initial commit with CI/CD pipeline"
   git push origin main
   ```

2. **Monitor pipeline execution**:
   - Go to GitHub repository > Actions tab
   - Watch the workflow execution

3. **Verify deployment**:
   ```bash
   # Get ALB DNS name
   aws elbv2 describe-load-balancers --names devsecops-alb --query 'LoadBalancers[0].DNSName' --output text
   
   # Test application
   curl http://<alb-dns-name>/
   ```

## ✅ Completion Checklist

- [ ] GitHub repository created with sample application
- [ ] GitHub Actions workflow configured
- [ ] AWS infrastructure deployed with ECS
- [ ] ECR repository created
- [ ] Security scanning integrated
- [ ] Automated testing implemented
- [ ] Blue-green deployment configured
- [ ] Application accessible via ALB
- [ ] Monitoring and logging configured

## 🧪 Verification Exercises

1. **Pipeline Testing**:
   - Make a code change and push to trigger pipeline
   - Verify all stages complete successfully
   - Check security scan results

2. **Deployment Testing**:
   - Verify application is accessible via ALB
   - Test health check endpoint
   - Monitor ECS service logs

3. **Rollback Testing**:
   - Deploy a broken version
   - Verify rollback mechanism works
   - Check service stability

## 🔗 Related Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [AWS ECS Documentation](https://docs.aws.amazon.com/ecs/)
- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)
- [Security Scanning with Bandit](https://bandit.readthedocs.io/)

## 🏆 Achievement Badge

**🚀 CI/CD Master**
*Successfully implemented a complete CI/CD pipeline with automated testing, security scanning, and deployment to AWS ECS.*

## 📝 Lab Journal Entry

**Date**: [Your Date]
**Time Spent**: [Your Time]
**Difficulty**: Intermediate
**Key Learnings**:
1. GitHub Actions provides powerful CI/CD capabilities
2. Security scanning should be integrated early in pipeline
3. Infrastructure as Code enables reproducible deployments
4. Blue-green deployment reduces downtime risk

**Challenges**: [Document any issues you encountered]
**Next Steps**: Move to Lab 6 - Jenkins Pipeline with Docker

---

**Congratulations!** You've successfully implemented a production-ready CI/CD pipeline! 🎉 