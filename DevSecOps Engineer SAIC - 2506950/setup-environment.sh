#!/bin/bash

# 🚀 DevSecOps Engineer Home Lab - Environment Setup Script
# This script sets up your complete learning environment for the SAIC DevSecOps position

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo -e "${CYAN}================================${NC}"
    echo -e "${CYAN}$1${NC}"
    echo -e "${CYAN}================================${NC}"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to detect OS
detect_os() {
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        echo "linux"
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        echo "macos"
    elif [[ "$OSTYPE" == "cygwin" ]] || [[ "$OSTYPE" == "msys" ]]; then
        echo "windows"
    else
        echo "unknown"
    fi
}

# Function to install package manager
install_package_manager() {
    local os=$(detect_os)
    
    if [[ "$os" == "macos" ]]; then
        if ! command_exists brew; then
            print_status "Installing Homebrew..."
            /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
        else
            print_status "Homebrew already installed"
        fi
    elif [[ "$os" == "linux" ]]; then
        if command_exists apt-get; then
            print_status "Using apt package manager"
        elif command_exists yum; then
            print_status "Using yum package manager"
        else
            print_error "Unsupported package manager. Please install apt or yum."
            exit 1
        fi
    fi
}

# Function to install AWS CLI
install_aws_cli() {
    print_header "Installing AWS CLI"
    
    if command_exists aws; then
        print_status "AWS CLI already installed"
        aws --version
        return
    fi
    
    local os=$(detect_os)
    
    if [[ "$os" == "macos" ]]; then
        print_status "Installing AWS CLI via Homebrew..."
        brew install awscli
    elif [[ "$os" == "linux" ]]; then
        print_status "Installing AWS CLI..."
        curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
        unzip awscliv2.zip
        sudo ./aws/install
        rm -rf aws awscliv2.zip
    else
        print_error "Please install AWS CLI manually from https://aws.amazon.com/cli/"
    fi
}

# Function to install Terraform
install_terraform() {
    print_header "Installing Terraform"
    
    if command_exists terraform; then
        print_status "Terraform already installed"
        terraform version
        return
    fi
    
    local os=$(detect_os)
    
    if [[ "$os" == "macos" ]]; then
        print_status "Installing Terraform via Homebrew..."
        brew install terraform
    elif [[ "$os" == "linux" ]]; then
        print_status "Installing Terraform..."
        curl -fsSL https://apt.releases.hashicorp.com/gpg | sudo apt-key add -
        sudo apt-add-repository "deb [arch=amd64] https://apt.releases.hashicorp.com $(lsb_release -cs) main"
        sudo apt-get update && sudo apt-get install terraform
    else
        print_error "Please install Terraform manually from https://www.terraform.io/downloads.html"
    fi
}

# Function to install kubectl
install_kubectl() {
    print_header "Installing kubectl"
    
    if command_exists kubectl; then
        print_status "kubectl already installed"
        kubectl version --client
        return
    fi
    
    local os=$(detect_os)
    
    if [[ "$os" == "macos" ]]; then
        print_status "Installing kubectl via Homebrew..."
        brew install kubectl
    elif [[ "$os" == "linux" ]]; then
        print_status "Installing kubectl..."
        curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
        chmod +x kubectl
        sudo mv kubectl /usr/local/bin/
    else
        print_error "Please install kubectl manually from https://kubernetes.io/docs/tasks/tools/install-kubectl/"
    fi
}

# Function to install eksctl
install_eksctl() {
    print_header "Installing eksctl"
    
    if command_exists eksctl; then
        print_status "eksctl already installed"
        eksctl version
        return
    fi
    
    local os=$(detect_os)
    
    if [[ "$os" == "macos" ]]; then
        print_status "Installing eksctl via Homebrew..."
        brew tap weaveworks/tap
        brew install weaveworks/tap/eksctl
    elif [[ "$os" == "linux" ]]; then
        print_status "Installing eksctl..."
        curl --silent --location "https://github.com/weaveworks/eksctl/releases/latest/download/eksctl_$(uname -s)_amd64.tar.gz" | tar xz -C /tmp
        sudo mv /tmp/eksctl /usr/local/bin
    else
        print_error "Please install eksctl manually from https://eksctl.io/introduction/installation/"
    fi
}

# Function to install Docker
install_docker() {
    print_header "Installing Docker"
    
    if command_exists docker; then
        print_status "Docker already installed"
        docker --version
        return
    fi
    
    local os=$(detect_os)
    
    if [[ "$os" == "macos" ]]; then
        print_status "Installing Docker Desktop..."
        brew install --cask docker
        print_warning "Please start Docker Desktop manually"
    elif [[ "$os" == "linux" ]]; then
        print_status "Installing Docker..."
        curl -fsSL https://get.docker.com -o get-docker.sh
        sudo sh get-docker.sh
        sudo usermod -aG docker $USER
        rm get-docker.sh
        print_warning "Please log out and back in for Docker group changes to take effect"
    else
        print_error "Please install Docker manually from https://docs.docker.com/get-docker/"
    fi
}

# Function to install Helm
install_helm() {
    print_header "Installing Helm"
    
    if command_exists helm; then
        print_status "Helm already installed"
        helm version
        return
    fi
    
    local os=$(detect_os)
    
    if [[ "$os" == "macos" ]]; then
        print_status "Installing Helm via Homebrew..."
        brew install helm
    elif [[ "$os" == "linux" ]]; then
        print_status "Installing Helm..."
        curl https://get.helm.sh/helm-v3.12.0-linux-amd64.tar.gz | tar xz
        sudo mv linux-amd64/helm /usr/local/bin/
        rm -rf linux-amd64
    else
        print_error "Please install Helm manually from https://helm.sh/docs/intro/install/"
    fi
}

# Function to install Minikube
install_minikube() {
    print_header "Installing Minikube"
    
    if command_exists minikube; then
        print_status "Minikube already installed"
        minikube version
        return
    fi
    
    local os=$(detect_os)
    
    if [[ "$os" == "macos" ]]; then
        print_status "Installing Minikube via Homebrew..."
        brew install minikube
    elif [[ "$os" == "linux" ]]; then
        print_status "Installing Minikube..."
        curl -LO https://storage.googleapis.com/minikube/releases/latest/minikube-linux-amd64
        sudo install minikube-linux-amd64 /usr/local/bin/minikube
        rm minikube-linux-amd64
    else
        print_error "Please install Minikube manually from https://minikube.sigs.k8s.io/docs/start/"
    fi
}

# Function to install Python and pip
install_python() {
    print_header "Installing Python and pip"
    
    if command_exists python3; then
        print_status "Python 3 already installed"
        python3 --version
    else
        local os=$(detect_os)
        
        if [[ "$os" == "macos" ]]; then
            print_status "Installing Python via Homebrew..."
            brew install python
        elif [[ "$os" == "linux" ]]; then
            print_status "Installing Python..."
            sudo apt-get update
            sudo apt-get install -y python3 python3-pip
        else
            print_error "Please install Python manually from https://www.python.org/downloads/"
        fi
    fi
    
    # Install Python packages
    print_status "Installing Python packages..."
    pip3 install boto3 kubernetes requests pyyaml
}

# Function to install Git
install_git() {
    print_header "Installing Git"
    
    if command_exists git; then
        print_status "Git already installed"
        git --version
        return
    fi
    
    local os=$(detect_os)
    
    if [[ "$os" == "macos" ]]; then
        print_status "Installing Git via Homebrew..."
        brew install git
    elif [[ "$os" == "linux" ]]; then
        print_status "Installing Git..."
        sudo apt-get update
        sudo apt-get install -y git
    else
        print_error "Please install Git manually from https://git-scm.com/downloads"
    fi
}

# Function to create project structure
create_project_structure() {
    print_header "Creating Project Structure"
    
    # Create main directories
    mkdir -p learning-paths/{aws-fundamentals,terraform-mastery,kubernetes-clusters,ci-cd-pipelines,security-first,enterprise-architecture}
    mkdir -p hands-on-projects/{microservices-app,serverless-functions,event-driven-architecture,irs-bmf-scenarios}
    mkdir -p infrastructure/{terraform-modules,cloudformation-templates,kubernetes-manifests}
    mkdir -p ci-cd/{jenkins-pipelines,gitlab-ci,circleci-configs}
    mkdir -p security/{security-scanning,compliance-frameworks,threat-modeling}
    mkdir -p monitoring/{logging,metrics,alerting}
    mkdir -p documentation/{setup-guides,best-practices,troubleshooting}
    mkdir -p scripts
    
    print_status "Project structure created successfully"
}

# Function to create configuration files
create_config_files() {
    print_header "Creating Configuration Files"
    
    # Create AWS configuration template
    cat > aws-config-template.txt << 'EOF'
# AWS Configuration Template
# Copy this to ~/.aws/credentials and ~/.aws/config

# ~/.aws/credentials
[default]
aws_access_key_id = YOUR_ACCESS_KEY
aws_secret_access_key = YOUR_SECRET_KEY

# ~/.aws/config
[default]
region = us-east-1
output = json
EOF

    # Create Terraform configuration template
    cat > terraform-config-template.tf << 'EOF'
# Terraform Configuration Template
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
  
  backend "s3" {
    bucket         = "your-terraform-state-bucket"
    key            = "dev/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "terraform-locks"
    encrypt        = true
  }
}

provider "aws" {
  region = "us-east-1"
  
  default_tags {
    tags = {
      Environment = "dev"
      Project     = "devsecops-learning"
      Owner       = "your-name"
    }
  }
}
EOF

    # Create Kubernetes configuration template
    cat > k8s-config-template.yaml << 'EOF'
# Kubernetes Configuration Template
apiVersion: v1
kind: Namespace
metadata:
  name: devsecops-app

---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-app
  namespace: devsecops-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: web-app
  template:
    metadata:
      labels:
        app: web-app
    spec:
      containers:
      - name: web-app
        image: nginx:latest
        ports:
        - containerPort: 80
EOF

    print_status "Configuration templates created"
}

# Function to create learning checklist
create_learning_checklist() {
    print_header "Creating Learning Checklist"
    
    cat > LEARNING_CHECKLIST.md << 'EOF'
# 🎯 DevSecOps Learning Checklist

## 🥉 Bronze Level - AWS Fundamentals
- [ ] AWS Account Setup
- [ ] EC2 Instance Management
- [ ] VPC and Networking
- [ ] S3 Storage Solutions
- [ ] IAM and Security
- [ ] Monitoring and Cost Management
- [ ] AWS CLI and SDKs

## 🥈 Silver Level - Infrastructure as Code
- [ ] Terraform Fundamentals
- [ ] AWS Resources with Terraform
- [ ] Terraform Modules
- [ ] State Management
- [ ] Security and Compliance
- [ ] Multi-Environment Management
- [ ] CI/CD Integration

## 🥈 Silver Level - Kubernetes Clusters
- [ ] Kubernetes Fundamentals
- [ ] EKS Cluster Management
- [ ] Application Deployment
- [ ] Helm Charts
- [ ] Monitoring and Observability
- [ ] Security and RBAC
- [ ] CI/CD Integration

## 🥇 Gold Level - CI/CD Pipelines
- [ ] Jenkins Setup and Configuration
- [ ] GitLab CI/CD
- [ ] Blue-Green Deployments
- [ ] Pipeline Security
- [ ] Automated Testing
- [ ] Deployment Strategies
- [ ] Monitoring and Alerting

## 🥇 Gold Level - Security Integration
- [ ] DevSecOps Principles
- [ ] Security Scanning
- [ ] Compliance Frameworks
- [ ] Threat Modeling
- [ ] Security Monitoring
- [ ] Incident Response
- [ ] Security Automation

## 🏆 Platinum Level - Enterprise Architecture
- [ ] Landing Zones
- [ ] Multi-Account AWS Setup
- [ ] Enterprise Security
- [ ] Disaster Recovery
- [ ] Performance Optimization
- [ ] Cost Management
- [ ] IRS-Specific Scenarios

## 🎯 Final Projects
- [ ] Complete Microservices Application
- [ ] Automated Deployment Pipeline
- [ ] Security Compliance Framework
- [ ] Monitoring and Alerting System
- [ ] Disaster Recovery Plan
- [ ] Cost Optimization Strategy
EOF

    print_status "Learning checklist created"
}

# Function to create cost tracking
create_cost_tracking() {
    print_header "Creating Cost Tracking"
    
    cat > COST_TRACKING.md << 'EOF'
# 💰 Cost Tracking and Budget Management

## AWS Free Tier (12 months)
- EC2: 750 hours/month (t2.micro)
- S3: 5GB storage
- RDS: 750 hours/month
- Lambda: 1M requests/month
- CloudWatch: Basic monitoring

## Estimated Monthly Costs

### Development Phase (Months 1-3)
- AWS Free Tier: $0
- Additional services: $10-30/month
- **Total: $10-30/month**

### Intermediate Phase (Months 4-6)
- EC2 instances: $20-50/month
- EKS cluster: $30-80/month
- Storage and data transfer: $10-20/month
- **Total: $60-150/month**

### Advanced Phase (Months 7-9)
- Multi-environment setup: $100-200/month
- Monitoring and logging: $20-40/month
- Security services: $10-30/month
- **Total: $130-270/month**

### Enterprise Phase (Months 10-12)
- Production simulation: $200-500/month
- High availability setup: $100-200/month
- Advanced monitoring: $50-100/month
- **Total: $350-800/month**

## Cost Optimization Tips
1. Use Spot Instances for non-critical workloads
2. Implement auto-scaling to scale down during off-hours
3. Use S3 lifecycle policies to move data to cheaper storage
4. Monitor and terminate unused resources
5. Use AWS Cost Explorer to track spending
6. Set up billing alerts to avoid surprises

## Budget Alerts
Set up CloudWatch billing alarms:
- Warning at 80% of budget
- Critical at 95% of budget
- Emergency at 100% of budget
EOF

    print_status "Cost tracking document created"
}

# Function to create troubleshooting guide
create_troubleshooting_guide() {
    print_header "Creating Troubleshooting Guide"
    
    cat > TROUBLESHOOTING.md << 'EOF'
# 🔧 Troubleshooting Guide

## Common Issues and Solutions

### AWS Issues
1. **Access Denied Errors**
   - Check IAM permissions
   - Verify AWS credentials
   - Ensure proper role assignments

2. **VPC Configuration Issues**
   - Verify subnet configurations
   - Check route table associations
   - Ensure internet gateway is attached

3. **EC2 Connection Issues**
   - Check security group rules
   - Verify key pair permissions
   - Ensure instance is in running state

### Terraform Issues
1. **State Lock Errors**
   - Check DynamoDB table
   - Verify backend configuration
   - Force unlock if necessary

2. **Provider Version Conflicts**
   - Update provider versions
   - Check compatibility matrix
   - Use version constraints

3. **Resource Creation Failures**
   - Check AWS service limits
   - Verify resource naming
   - Review error messages

### Kubernetes Issues
1. **Pod Startup Failures**
   - Check pod events: `kubectl describe pod <pod-name>`
   - Verify image availability
   - Check resource limits

2. **Service Connectivity Issues**
   - Verify service selectors
   - Check endpoint configuration
   - Test network policies

3. **EKS Cluster Issues**
   - Check node group status
   - Verify IAM roles
   - Review CloudWatch logs

### CI/CD Issues
1. **Pipeline Failures**
   - Check build logs
   - Verify credentials
   - Test locally first

2. **Deployment Issues**
   - Check Kubernetes events
   - Verify manifest syntax
   - Test with dry-run

## Useful Commands
```bash
# AWS
aws sts get-caller-identity
aws ec2 describe-instances --filters "Name=instance-state-name,Values=running"

# Terraform
terraform plan -refresh-only
terraform state list
terraform validate

# Kubernetes
kubectl get events --sort-by='.lastTimestamp'
kubectl logs -f <pod-name>
kubectl describe <resource> <name>

# Docker
docker system prune -a
docker images
docker ps -a
```

## Getting Help
1. Check official documentation
2. Search Stack Overflow
3. Join community forums
4. Review GitHub issues
5. Contact support if needed
EOF

    print_status "Troubleshooting guide created"
}

# Function to validate installation
validate_installation() {
    print_header "Validating Installation"
    
    local tools=("aws" "terraform" "kubectl" "eksctl" "docker" "helm" "git" "python3")
    local all_installed=true
    
    for tool in "${tools[@]}"; do
        if command_exists "$tool"; then
            print_status "✓ $tool is installed"
        else
            print_error "✗ $tool is not installed"
            all_installed=false
        fi
    done
    
    if [[ "$all_installed" == true ]]; then
        print_status "All tools are installed successfully!"
    else
        print_warning "Some tools are missing. Please install them manually."
    fi
}

# Function to display next steps
display_next_steps() {
    print_header "Next Steps"
    
    cat << 'EOF'

🎉 Environment setup complete! Here's what to do next:

1. 🏆 Start with AWS Fundamentals:
   cd learning-paths/aws-fundamentals
   Follow the README.md guide

2. 💳 Set up AWS Account:
   - Create AWS account with free tier
   - Configure AWS CLI credentials
   - Set up billing alerts

3. 📚 Begin Learning Path:
   - Complete Bronze Level exercises
   - Track progress in LEARNING_CHECKLIST.md
   - Monitor costs in COST_TRACKING.md

4. 🔧 Configure Tools:
   - Set up Git configuration
   - Configure Docker (if needed)
   - Test all tools work correctly

5. 🎯 Start First Project:
   - Deploy simple EC2 instance
   - Create S3 bucket
   - Test AWS CLI commands

📖 Useful Resources:
- AWS Free Tier: https://aws.amazon.com/free/
- Terraform Documentation: https://www.terraform.io/docs
- Kubernetes Documentation: https://kubernetes.io/docs/
- EKS Workshop: https://www.eksworkshop.com/

🚀 Happy Learning! 🚀
EOF
}

# Main setup function
main() {
    print_header "DevSecOps Engineer Home Lab Setup"
    print_status "Setting up your complete learning environment..."
    
    # Detect OS and install package manager
    install_package_manager
    
    # Install all required tools
    install_git
    install_aws_cli
    install_terraform
    install_kubectl
    install_eksctl
    install_docker
    install_helm
    install_minikube
    install_python
    
    # Create project structure and files
    create_project_structure
    create_config_files
    create_learning_checklist
    create_cost_tracking
    create_troubleshooting_guide
    
    # Validate installation
    validate_installation
    
    # Display next steps
    display_next_steps
    
    print_header "Setup Complete! 🎉"
}

# Run main function
main "$@" 