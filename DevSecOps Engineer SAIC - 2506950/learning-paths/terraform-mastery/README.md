# 🥈 Terraform Mastery - Silver Level

## 🎯 Learning Objectives

By the end of this module, you will be able to:
- Write and manage Terraform configurations
- Implement Infrastructure as Code best practices
- Create reusable Terraform modules
- Manage multiple environments (Dev/Test/Prod)
- Implement state management and remote backends
- Integrate Terraform with CI/CD pipelines
- Apply security and compliance practices

## 🎮 Achievement Badges

- 🥈 **Terraform Novice** - Basic configuration and deployment
- 🥈 **Module Master** - Create and use reusable modules
- 🥈 **State Manager** - Implement remote state and workspaces
- 🥈 **Multi-Environment Expert** - Manage Dev/Test/Prod environments
- 🥈 **Security Practitioner** - Implement security best practices
- 🥈 **CI/CD Integrator** - Automate Terraform deployments

## 📋 Prerequisites

- Completed AWS Fundamentals (Bronze Level)
- Basic understanding of YAML/JSON
- Familiarity with Git version control
- AWS CLI configured and working

## 🚀 Module 1: Terraform Fundamentals

### Exercise 1.1: Install and Configure Terraform
**Difficulty**: ⭐  
**Time**: 30 minutes  
**Cost**: $0

#### Steps:
1. **Install Terraform**
   ```bash
   # macOS
   brew install terraform
   
   # Linux
   curl -fsSL https://apt.releases.hashicorp.com/gpg | sudo apt-key add -
   sudo apt-add-repository "deb [arch=amd64] https://apt.releases.hashicorp.com $(lsb_release -cs) main"
   sudo apt-get update && sudo apt-get install terraform
   
   # Windows
   # Download from https://www.terraform.io/downloads.html
   ```

2. **Verify Installation**
   ```bash
   terraform version
   terraform -help
   ```

3. **Configure AWS Provider**
   ```bash
   # Ensure AWS CLI is configured
   aws configure list
   ```

#### 🎯 Learning Checkpoint:
- [ ] Terraform installed successfully
- [ ] Can run terraform commands
- [ ] AWS provider configured
- [ ] Understand basic syntax

### Exercise 1.2: Your First Terraform Configuration
**Difficulty**: ⭐⭐  
**Time**: 60 minutes  
**Cost**: $0-1 (Free Tier)

#### Steps:
1. **Create Project Directory**
   ```bash
   mkdir terraform-first-project
   cd terraform-first-project
   ```

2. **Create main.tf**
   ```hcl
   # Configure AWS Provider
   terraform {
     required_providers {
       aws = {
         source  = "hashicorp/aws"
         version = "~> 5.0"
       }
     }
   }
   
   provider "aws" {
     region = "us-east-1"
   }
   
   # Create S3 bucket
   resource "aws_s3_bucket" "my_bucket" {
     bucket = "my-unique-terraform-bucket-2024"
   }
   
   # Enable versioning
   resource "aws_s3_bucket_versioning" "my_bucket_versioning" {
     bucket = aws_s3_bucket.my_bucket.id
     versioning_configuration {
       status = "Enabled"
     }
   }
   
   # Output bucket name
   output "bucket_name" {
     value = aws_s3_bucket.my_bucket.bucket
   }
   ```

3. **Initialize and Deploy**
   ```bash
   # Initialize Terraform
   terraform init
   
   # Plan the deployment
   terraform plan
   
   # Apply the configuration
   terraform apply
   
   # Verify in AWS Console
   aws s3 ls
   ```

4. **Clean Up**
   ```bash
   terraform destroy
   ```

#### 🎯 Learning Checkpoint:
- [ ] Can write basic Terraform configuration
- [ ] Understand provider configuration
- [ ] Can deploy and destroy resources
- [ ] Know basic HCL syntax

## 🏗️ Module 2: Core AWS Resources

### Exercise 2.1: VPC and Networking
**Difficulty**: ⭐⭐⭐  
**Time**: 120 minutes  
**Cost**: $0-2

#### Steps:
1. **Create VPC Configuration**
   ```hcl
   # VPC
   resource "aws_vpc" "main" {
     cidr_block           = "10.0.0.0/16"
     enable_dns_hostnames = true
     enable_dns_support   = true
   
     tags = {
       Name = "main-vpc"
     }
   }
   
   # Public Subnets
   resource "aws_subnet" "public" {
     count             = 2
     vpc_id            = aws_vpc.main.id
     cidr_block        = "10.0.${count.index + 1}.0/24"
     availability_zone = data.aws_availability_zones.available.names[count.index]
   
     tags = {
       Name = "public-subnet-${count.index + 1}"
     }
   }
   
   # Private Subnets
   resource "aws_subnet" "private" {
     count             = 2
     vpc_id            = aws_vpc.main.id
     cidr_block        = "10.0.${count.index + 10}.0/24"
     availability_zone = data.aws_availability_zones.available.names[count.index]
   
     tags = {
       Name = "private-subnet-${count.index + 1}"
     }
   }
   
   # Internet Gateway
   resource "aws_internet_gateway" "main" {
     vpc_id = aws_vpc.main.id
   
     tags = {
       Name = "main-igw"
     }
   }
   
   # Route Table for Public Subnets
   resource "aws_route_table" "public" {
     vpc_id = aws_vpc.main.id
   
     route {
       cidr_block = "0.0.0.0/0"
       gateway_id = aws_internet_gateway.main.id
     }
   
     tags = {
       Name = "public-rt"
     }
   }
   
   # Route Table Association
   resource "aws_route_table_association" "public" {
     count          = 2
     subnet_id      = aws_subnet.public[count.index].id
     route_table_id = aws_route_table.public.id
   }
   ```

2. **Add Data Sources**
   ```hcl
   # Data sources
   data "aws_availability_zones" "available" {
     state = "available"
   }
   
   data "aws_region" "current" {}
   ```

3. **Deploy and Test**
   ```bash
   terraform init
   terraform plan
   terraform apply
   ```

#### 🎯 Learning Checkpoint:
- [ ] VPC created with proper CIDR
- [ ] Public and private subnets configured
- [ ] Internet gateway attached
- [ ] Route tables configured

### Exercise 2.2: EC2 Instances and Security Groups
**Difficulty**: ⭐⭐⭐  
**Time**: 90 minutes  
**Cost**: $0-5

#### Steps:
1. **Create Security Groups**
   ```hcl
   # Security Group for Web Servers
   resource "aws_security_group" "web" {
     name        = "web-sg"
     description = "Security group for web servers"
     vpc_id      = aws_vpc.main.id
   
     ingress {
       description = "HTTP"
       from_port   = 80
       to_port     = 80
       protocol    = "tcp"
       cidr_blocks = ["0.0.0.0/0"]
     }
   
     ingress {
       description = "HTTPS"
       from_port   = 443
       to_port     = 443
       protocol    = "tcp"
       cidr_blocks = ["0.0.0.0/0"]
     }
   
     ingress {
       description = "SSH"
       from_port   = 22
       to_port     = 22
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
       Name = "web-sg"
     }
   }
   ```

2. **Create EC2 Instances**
   ```hcl
   # Data source for latest Amazon Linux 2 AMI
   data "aws_ami" "amazon_linux" {
     most_recent = true
     owners      = ["amazon"]
   
     filter {
       name   = "name"
       values = ["amzn2-ami-hvm-*-x86_64-gp2"]
     }
   }
   
   # EC2 Instance
   resource "aws_instance" "web" {
     ami           = data.aws_ami.amazon_linux.id
     instance_type = "t2.micro"
     subnet_id     = aws_subnet.public[0].id
   
     vpc_security_group_ids = [aws_security_group.web.id]
     key_name               = "your-key-pair-name"
   
     user_data = <<-EOF
               #!/bin/bash
               yum update -y
               yum install -y httpd
               systemctl start httpd
               systemctl enable httpd
               echo "<h1>Hello from Terraform!</h1>" > /var/www/html/index.html
               EOF
   
     tags = {
       Name = "web-server"
     }
   }
   ```

3. **Add Outputs**
   ```hcl
   output "instance_public_ip" {
     value = aws_instance.web.public_ip
   }
   
   output "instance_id" {
     value = aws_instance.web.id
   }
   ```

#### 🎯 Learning Checkpoint:
- [ ] Security groups created
- [ ] EC2 instances deployed
- [ ] User data script working
- [ ] Can access web server

## 📦 Module 3: Terraform Modules

### Exercise 3.1: Create Reusable Modules
**Difficulty**: ⭐⭐⭐⭐  
**Time**: 150 minutes  
**Cost**: $0-5

#### Steps:
1. **Create Module Structure**
   ```bash
   mkdir -p modules/vpc
   mkdir -p modules/ec2
   mkdir -p modules/security-groups
   ```

2. **VPC Module (modules/vpc/main.tf)**
   ```hcl
   variable "vpc_cidr" {
     description = "CIDR block for VPC"
     type        = string
     default     = "10.0.0.0/16"
   }
   
   variable "environment" {
     description = "Environment name"
     type        = string
   }
   
   variable "azs" {
     description = "Availability zones"
     type        = list(string)
   }
   
   resource "aws_vpc" "main" {
     cidr_block           = var.vpc_cidr
     enable_dns_hostnames = true
     enable_dns_support   = true
   
     tags = {
       Name        = "${var.environment}-vpc"
       Environment = var.environment
     }
   }
   
   resource "aws_subnet" "public" {
     count             = length(var.azs)
     vpc_id            = aws_vpc.main.id
     cidr_block        = cidrsubnet(var.vpc_cidr, 8, count.index)
     availability_zone = var.azs[count.index]
   
     tags = {
       Name        = "${var.environment}-public-subnet-${count.index + 1}"
       Environment = var.environment
     }
   }
   
   resource "aws_subnet" "private" {
     count             = length(var.azs)
     vpc_id            = aws_vpc.main.id
     cidr_block        = cidrsubnet(var.vpc_cidr, 8, count.index + 10)
     availability_zone = var.azs[count.index]
   
     tags = {
       Name        = "${var.environment}-private-subnet-${count.index + 1}"
       Environment = var.environment
     }
   }
   
   output "vpc_id" {
     value = aws_vpc.main.id
   }
   
   output "public_subnet_ids" {
     value = aws_subnet.public[*].id
   }
   
   output "private_subnet_ids" {
     value = aws_subnet.private[*].id
   }
   ```

3. **Security Groups Module (modules/security-groups/main.tf)**
   ```hcl
   variable "vpc_id" {
     description = "VPC ID"
     type        = string
   }
   
   variable "environment" {
     description = "Environment name"
     type        = string
   }
   
   resource "aws_security_group" "web" {
     name        = "${var.environment}-web-sg"
     description = "Security group for web servers"
     vpc_id      = var.vpc_id
   
     ingress {
       description = "HTTP"
       from_port   = 80
       to_port     = 80
       protocol    = "tcp"
       cidr_blocks = ["0.0.0.0/0"]
     }
   
     ingress {
       description = "HTTPS"
       from_port   = 443
       to_port     = 443
       protocol    = "tcp"
       cidr_blocks = ["0.0.0.0/0"]
     }
   
     ingress {
       description = "SSH"
       from_port   = 22
       to_port     = 22
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
       Name        = "${var.environment}-web-sg"
       Environment = var.environment
     }
   }
   
   output "web_sg_id" {
     value = aws_security_group.web.id
   }
   ```

4. **Use Modules in Main Configuration**
   ```hcl
   # main.tf
   terraform {
     required_providers {
       aws = {
         source  = "hashicorp/aws"
         version = "~> 5.0"
       }
     }
   }
   
   provider "aws" {
     region = "us-east-1"
   }
   
   data "aws_availability_zones" "available" {
     state = "available"
   }
   
   # Use VPC module
   module "vpc" {
     source = "./modules/vpc"
   
     vpc_cidr    = "10.0.0.0/16"
     environment = "dev"
     azs         = slice(data.aws_availability_zones.available.names, 0, 2)
   }
   
   # Use Security Groups module
   module "security_groups" {
     source = "./modules/security-groups"
   
     vpc_id      = module.vpc.vpc_id
     environment = "dev"
   }
   ```

#### 🎯 Learning Checkpoint:
- [ ] Module structure created
- [ ] Variables and outputs defined
- [ ] Modules can be reused
- [ ] Understand module best practices

### Exercise 3.2: Terraform Registry Modules
**Difficulty**: ⭐⭐⭐  
**Time**: 60 minutes  
**Cost**: $0-2

#### Steps:
1. **Use Official AWS Modules**
   ```hcl
   # Use official AWS VPC module
   module "vpc" {
     source = "terraform-aws-modules/vpc/aws"
     version = "5.0.0"
   
     name = "my-vpc"
     cidr = "10.0.0.0/16"
   
     azs             = ["us-east-1a", "us-east-1b"]
     private_subnets = ["10.0.1.0/24", "10.0.2.0/24"]
     public_subnets  = ["10.0.101.0/24", "10.0.102.0/24"]
   
     enable_nat_gateway = true
     single_nat_gateway = true
   
     tags = {
       Environment = "dev"
     }
   }
   ```

2. **Use Community Modules**
   ```hcl
   # Use community module for EC2 instances
   module "ec2_instances" {
     source  = "terraform-aws-modules/ec2-instance/aws"
     version = "~> 3.0"
   
     name = "web-servers"
   
     instance_count = 2
     instance_type  = "t2.micro"
   
     subnet_id                   = module.vpc.public_subnets[0]
     vpc_security_group_ids      = [module.security_groups.web_sg_id]
     associate_public_ip_address = true
   
     tags = {
       Environment = "dev"
     }
   }
   ```

#### 🎯 Learning Checkpoint:
- [ ] Can use official modules
- [ ] Understand module versioning
- [ ] Can customize module parameters
- [ ] Know where to find modules

## 🔄 Module 4: State Management

### Exercise 4.1: Remote State with S3 Backend
**Difficulty**: ⭐⭐⭐⭐  
**Time**: 90 minutes  
**Cost**: $0-1

#### Steps:
1. **Create S3 Backend Bucket**
   ```hcl
   # backend-setup/main.tf
   resource "aws_s3_bucket" "terraform_state" {
     bucket = "my-terraform-state-bucket-2024"
   }
   
   resource "aws_s3_bucket_versioning" "terraform_state" {
     bucket = aws_s3_bucket.terraform_state.id
     versioning_configuration {
       status = "Enabled"
     }
   }
   
   resource "aws_s3_bucket_server_side_encryption_configuration" "terraform_state" {
     bucket = aws_s3_bucket.terraform_state.id
   
     rule {
       apply_server_side_encryption_by_default {
         sse_algorithm = "AES256"
       }
     }
   }
   
   resource "aws_s3_bucket_public_access_block" "terraform_state" {
     bucket = aws_s3_bucket.terraform_state.id
   
     block_public_acls       = true
     block_public_policy     = true
     ignore_public_acls      = true
     restrict_public_buckets = true
   }
   
   resource "aws_dynamodb_table" "terraform_locks" {
     name           = "terraform-locks"
     billing_mode   = "PAY_PER_REQUEST"
     hash_key       = "LockID"
   
     attribute {
       name = "LockID"
       type = "S"
     }
   }
   ```

2. **Configure Remote Backend**
   ```hcl
   # main.tf
   terraform {
     required_providers {
       aws = {
         source  = "hashicorp/aws"
         version = "~> 5.0"
       }
     }
   
     backend "s3" {
       bucket         = "my-terraform-state-bucket-2024"
       key            = "dev/terraform.tfstate"
       region         = "us-east-1"
       dynamodb_table = "terraform-locks"
       encrypt        = true
     }
   }
   ```

3. **Initialize with Backend**
   ```bash
   terraform init -migrate-state
   ```

#### 🎯 Learning Checkpoint:
- [ ] S3 backend configured
- [ ] State locking with DynamoDB
- [ ] State encryption enabled
- [ ] Can migrate state

### Exercise 4.2: Terraform Workspaces
**Difficulty**: ⭐⭐⭐  
**Time**: 60 minutes  
**Cost**: $0-5

#### Steps:
1. **Create Workspaces**
   ```bash
   # Create workspaces for different environments
   terraform workspace new dev
   terraform workspace new staging
   terraform workspace new prod
   
   # List workspaces
   terraform workspace list
   
   # Switch between workspaces
   terraform workspace select dev
   ```

2. **Use Workspace-Specific Variables**
   ```hcl
   # variables.tf
   variable "environment" {
     description = "Environment name"
     type        = string
   }
   
   variable "instance_type" {
     description = "EC2 instance type"
     type        = string
   }
   
   # locals.tf
   locals {
     environment_config = {
       dev = {
         instance_type = "t2.micro"
         instance_count = 1
       }
       staging = {
         instance_type = "t2.small"
         instance_count = 2
       }
       prod = {
         instance_type = "t2.medium"
         instance_count = 3
       }
     }
   }
   
   # main.tf
   resource "aws_instance" "web" {
     count         = local.environment_config[terraform.workspace].instance_count
     ami           = data.aws_ami.amazon_linux.id
     instance_type = local.environment_config[terraform.workspace].instance_type
     # ... other configuration
   }
   ```

#### 🎯 Learning Checkpoint:
- [ ] Can create and switch workspaces
- [ ] Understand workspace isolation
- [ ] Can use workspace-specific configs
- [ ] Know workspace limitations

## 🔒 Module 5: Security and Compliance

### Exercise 5.1: Security Best Practices
**Difficulty**: ⭐⭐⭐⭐  
**Time**: 120 minutes  
**Cost**: $0-5

#### Steps:
1. **Implement Least Privilege**
   ```hcl
   # Create IAM role with minimal permissions
   resource "aws_iam_role" "ec2_role" {
     name = "ec2-role"
   
     assume_role_policy = jsonencode({
       Version = "2012-10-17"
       Statement = [
         {
           Action = "sts:AssumeRole"
           Effect = "Allow"
           Principal = {
             Service = "ec2.amazonaws.com"
           }
         }
       ]
     })
   }
   
   resource "aws_iam_role_policy" "ec2_policy" {
     name = "ec2-policy"
     role = aws_iam_role.ec2_role.id
   
     policy = jsonencode({
       Version = "2012-10-17"
       Statement = [
         {
           Effect = "Allow"
           Action = [
             "s3:GetObject",
             "s3:PutObject"
           ]
           Resource = [
             "arn:aws:s3:::my-bucket/*"
           ]
         }
       ]
     })
   }
   ```

2. **Enable CloudTrail**
   ```hcl
   resource "aws_cloudtrail" "main" {
     name           = "main-trail"
     s3_bucket_name = aws_s3_bucket.cloudtrail.id
   
     event_selector {
       read_write_type                 = "All"
       include_management_events       = true
       data_resource {
         type   = "AWS::S3::Object"
         values = ["arn:aws:s3:::"]
       }
     }
   }
   ```

3. **Enable AWS Config**
   ```hcl
   resource "aws_config_configuration_recorder" "main" {
     name     = "main-config-recorder"
     role_arn = aws_iam_role.config_role.arn
   }
   
   resource "aws_config_delivery_channel" "main" {
     name           = "main-delivery-channel"
     s3_bucket_name = aws_s3_bucket.config.id
   }
   ```

#### 🎯 Learning Checkpoint:
- [ ] IAM roles with least privilege
- [ ] CloudTrail logging enabled
- [ ] AWS Config configured
- [ ] Security groups properly configured

### Exercise 5.2: Compliance and Tagging
**Difficulty**: ⭐⭐⭐⭐  
**Time**: 90 minutes  
**Cost**: $0-2

#### Steps:
1. **Implement Tagging Strategy**
   ```hcl
   # locals.tf
   locals {
     common_tags = {
       Environment = var.environment
       Project     = var.project
       Owner       = var.owner
       CostCenter  = var.cost_center
       Compliance  = "SOX"
     }
   }
   
   # Apply tags to all resources
   resource "aws_instance" "web" {
     # ... other configuration
   
     tags = merge(local.common_tags, {
       Name = "web-server"
       Type = "web"
     })
   }
   ```

2. **Create Compliance Policies**
   ```hcl
   # AWS Config rules
   resource "aws_config_config_rule" "required_tags" {
     name = "required-tags"
   
     source {
       owner             = "AWS"
       source_identifier = "REQUIRED_TAGS"
     }
   
     input_parameters = jsonencode({
       tag1Key   = "Environment"
       tag1Value = "prod"
       tag2Key   = "Project"
       tag2Value = "my-project"
     })
   }
   ```

#### 🎯 Learning Checkpoint:
- [ ] Consistent tagging strategy
- [ ] Compliance policies configured
- [ ] Cost allocation tags
- [ ] Audit trail enabled

## 🔄 Module 6: Multi-Environment Management

### Exercise 6.1: Environment Separation
**Difficulty**: ⭐⭐⭐⭐⭐  
**Time**: 180 minutes  
**Cost**: $0-10

#### Steps:
1. **Create Environment Structure**
   ```bash
   mkdir -p environments/{dev,staging,prod}
   ```

2. **Environment-Specific Configurations**
   ```hcl
   # environments/dev/main.tf
   terraform {
     required_providers {
       aws = {
         source  = "hashicorp/aws"
         version = "~> 5.0"
       }
     }
   
     backend "s3" {
       bucket         = "my-terraform-state-bucket-2024"
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
         Project     = "my-project"
         Owner       = "devops-team"
       }
     }
   }
   
   module "vpc" {
     source = "../../modules/vpc"
   
     vpc_cidr    = "10.0.0.0/16"
     environment = "dev"
     azs         = ["us-east-1a", "us-east-1b"]
   }
   
   module "ec2" {
     source = "../../modules/ec2"
   
     vpc_id      = module.vpc.vpc_id
     subnet_ids  = module.vpc.public_subnet_ids
     environment = "dev"
     instance_count = 1
     instance_type  = "t2.micro"
   }
   ```

3. **Staging Environment**
   ```hcl
   # environments/staging/main.tf
   # Similar to dev but with different values
   module "ec2" {
     source = "../../modules/ec2"
   
     vpc_id      = module.vpc.vpc_id
     subnet_ids  = module.vpc.public_subnet_ids
     environment = "staging"
     instance_count = 2
     instance_type  = "t2.small"
   }
   ```

4. **Production Environment**
   ```hcl
   # environments/prod/main.tf
   # Similar to staging but with production values
   module "ec2" {
     source = "../../modules/ec2"
   
     vpc_id      = module.vpc.vpc_id
     subnet_ids  = module.vpc.public_subnet_ids
     environment = "prod"
     instance_count = 3
     instance_type  = "t2.medium"
   }
   ```

#### 🎯 Learning Checkpoint:
- [ ] Environment separation implemented
- [ ] Different configurations per environment
- [ ] State isolation
- [ ] Consistent module usage

### Exercise 6.2: Blue-Green Deployments
**Difficulty**: ⭐⭐⭐⭐⭐  
**Time**: 150 minutes  
**Cost**: $0-15

#### Steps:
1. **Create Blue-Green Infrastructure**
   ```hcl
   # Create two identical environments
   module "blue" {
     source = "./modules/environment"
   
     environment = "blue"
     vpc_cidr    = "10.1.0.0/16"
     color       = "blue"
   }
   
   module "green" {
     source = "./modules/environment"
   
     environment = "green"
     vpc_cidr    = "10.2.0.0/16"
     color       = "green"
   }
   
   # Route53 for traffic switching
   resource "aws_route53_zone" "main" {
     name = "myapp.com"
   }
   
   resource "aws_route53_record" "app" {
     zone_id = aws_route53_zone.main.zone_id
     name    = "app.myapp.com"
     type    = "A"
   
     alias {
       name                   = module.blue.alb_dns_name
       zone_id                = module.blue.alb_zone_id
       evaluate_target_health = true
     }
   }
   ```

2. **Deployment Script**
   ```bash
   #!/bin/bash
   # deploy.sh
   
   ENVIRONMENT=$1
   
   if [ "$ENVIRONMENT" = "blue" ]; then
     # Deploy to blue environment
     cd environments/blue
     terraform apply -auto-approve
     
     # Update DNS to point to blue
     aws route53 change-resource-record-sets \
       --hosted-zone-id Z1234567890 \
       --change-batch file://blue-dns.json
   elif [ "$ENVIRONMENT" = "green" ]; then
     # Deploy to green environment
     cd environments/green
     terraform apply -auto-approve
     
     # Update DNS to point to green
     aws route53 change-resource-record-sets \
       --hosted-zone-id Z1234567890 \
       --change-batch file://green-dns.json
   fi
   ```

#### 🎯 Learning Checkpoint:
- [ ] Blue-green infrastructure created
- [ ] Traffic switching mechanism
- [ ] Deployment automation
- [ ] Rollback capability

## 🔧 Module 7: CI/CD Integration

### Exercise 7.1: Jenkins Pipeline
**Difficulty**: ⭐⭐⭐⭐  
**Time**: 120 minutes  
**Cost**: $0-5

#### Steps:
1. **Create Jenkinsfile**
   ```groovy
   pipeline {
     agent any
   
     environment {
       AWS_REGION = 'us-east-1'
       TF_VERSION = '1.5.0'
     }
   
     stages {
       stage('Checkout') {
         steps {
           checkout scm
         }
       }
   
       stage('Install Terraform') {
         steps {
           sh '''
             wget https://releases.hashicorp.com/terraform/${TF_VERSION}/terraform_${TF_VERSION}_linux_amd64.zip
             unzip terraform_${TF_VERSION}_linux_amd64.zip
             sudo mv terraform /usr/local/bin/
           '''
         }
       }
   
       stage('Terraform Init') {
         steps {
           dir('environments/dev') {
             sh 'terraform init'
           }
         }
       }
   
       stage('Terraform Plan') {
         steps {
           dir('environments/dev') {
             sh 'terraform plan -out=tfplan'
           }
         }
       }
   
       stage('Terraform Apply') {
         when {
           branch 'main'
         }
         steps {
           dir('environments/dev') {
             sh 'terraform apply -auto-approve tfplan'
           }
         }
       }
     }
   
     post {
       always {
         cleanWs()
       }
     }
   }
   ```

2. **GitLab CI Configuration**
   ```yaml
   # .gitlab-ci.yml
   stages:
     - validate
     - plan
     - apply
   
   variables:
     TF_ROOT: "${CI_PROJECT_DIR}/environments/dev"
     TF_ADDRESS: "${CI_API_V4_URL}/projects/${CI_PROJECT_ID}/terraform/state/dev"
   
   before_script:
     - cd ${TF_ROOT}
     - terraform --version
     - terraform init
   
   validate:
     stage: validate
     script:
       - terraform validate
   
   plan:
     stage: plan
     script:
       - terraform plan -out=plan.tfplan
     artifacts:
       paths:
         - ${TF_ROOT}/plan.tfplan
       expire_in: 1 week
   
   apply:
     stage: apply
     script:
       - terraform apply plan.tfplan
     dependencies:
       - plan
     when: manual
     only:
       - main
   ```

#### 🎯 Learning Checkpoint:
- [ ] Jenkins pipeline configured
- [ ] GitLab CI working
- [ ] Automated deployments
- [ ] Manual approval gates

## 🎯 Final Project: Enterprise Infrastructure

### Project Overview
Create a complete enterprise infrastructure with:
- **Multi-environment setup** (Dev/Staging/Prod)
- **Blue-green deployment capability**
- **Security and compliance**
- **Monitoring and logging**
- **Cost optimization**

### Requirements
1. **Infrastructure Components**
   - VPC with public/private subnets
   - Application Load Balancer
   - Auto Scaling Groups
   - RDS database
   - ElastiCache Redis
   - S3 for static content

2. **Security Implementation**
   - IAM roles with least privilege
   - Security groups and NACLs
   - CloudTrail and AWS Config
   - Encryption at rest and in transit

3. **Monitoring and Logging**
   - CloudWatch dashboards
   - SNS notifications
   - CloudWatch Logs
   - X-Ray tracing

### Deliverables
- [ ] Complete Terraform configurations
- [ ] Multi-environment deployment
- [ ] CI/CD pipeline
- [ ] Security assessment
- [ ] Cost optimization report
- [ ] Documentation

## 🏆 Silver Level Completion

### Requirements for Silver Badge:
- [ ] Complete all exercises in Modules 1-7
- [ ] Deploy enterprise infrastructure
- [ ] Implement CI/CD pipeline
- [ ] Achieve 85% on knowledge assessment
- [ ] Create reusable modules
- [ ] Document best practices

### Next Steps:
- Move to **Gold Level**: Kubernetes Clusters
- Continue with **CI/CD Pipelines**
- Start **Security Integration** module

## 📚 Additional Resources

### Official Documentation:
- [Terraform Documentation](https://www.terraform.io/docs)
- [Terraform AWS Provider](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)
- [Terraform Best Practices](https://www.terraform.io/docs/cloud/guides/recommended-practices/index.html)

### Learning Resources:
- [HashiCorp Learn](https://learn.hashicorp.com/terraform)
- [Terraform Up & Running](https://www.terraformupandrunning.com/)
- [Terraform Examples](https://github.com/hashicorp/terraform-provider-aws/tree/main/examples)

### Certifications:
- HashiCorp Terraform Associate ($70.50)
- AWS Solutions Architect Professional ($300)

### Practice Platforms:
- [Terraform Cloud](https://www.terraform.io/cloud)
- [AWS Free Tier](https://aws.amazon.com/free/)
- [LocalStack](https://localstack.cloud/) (for local testing)

---

**🎉 Congratulations! You've completed the Terraform Mastery module! 🎉**

*Ready to move to the next level? Let's tackle Kubernetes and container orchestration!* 