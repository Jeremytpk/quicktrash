# Lab 1: AWS VPC with Public/Private Subnets

## 🎯 Learning Objectives
- Understand AWS VPC concepts and components
- Create a secure network architecture
- Configure public and private subnets
- Set up Internet Gateway and NAT Gateway
- Implement proper routing and security groups

## ⏱️ Estimated Time
- **Setup**: 30 minutes
- **Configuration**: 45 minutes
- **Testing**: 30 minutes
- **Cleanup**: 15 minutes
- **Total**: 2 hours

## 💰 Cost Estimate
- **VPC**: Free
- **NAT Gateway**: ~$0.045/hour + data processing
- **EC2 Instances**: ~$0.01/hour each (t3.micro)
- **Total for 2 hours**: ~$0.15

## 🟢 Difficulty Level: Beginner

## 📋 Prerequisites
- [ ] AWS Account with appropriate permissions
- [ ] AWS CLI configured
- [ ] Basic understanding of networking concepts
- [ ] Terraform installed

## 🏗️ Architecture Overview

```
Internet
    │
    ▼
Internet Gateway
    │
    ▼
Public Subnet (10.0.1.0/24)
    │
    ▼
NAT Gateway
    │
    ▼
Private Subnet (10.0.2.0/24)
    │
    ▼
EC2 Instance (Private)
```

## 🚀 Step-by-Step Instructions

### Step 1: Create Terraform Configuration

Create the following files in your lab directory:

#### `main.tf`
```hcl
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

# VPC
resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name = "devsecops-vpc"
    Lab  = "lab-01"
  }
}

# Public Subnet
resource "aws_subnet" "public" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = "10.0.1.0/24"
  availability_zone       = "us-east-1a"
  map_public_ip_on_launch = true

  tags = {
    Name = "public-subnet"
    Lab  = "lab-01"
  }
}

# Private Subnet
resource "aws_subnet" "private" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.2.0/24"
  availability_zone = "us-east-1b"

  tags = {
    Name = "private-subnet"
    Lab  = "lab-01"
  }
}

# Internet Gateway
resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name = "main-igw"
    Lab  = "lab-01"
  }
}

# Elastic IP for NAT Gateway
resource "aws_eip" "nat" {
  domain = "vpc"
  tags = {
    Name = "nat-eip"
    Lab  = "lab-01"
  }
}

# NAT Gateway
resource "aws_nat_gateway" "main" {
  allocation_id = aws_eip.nat.id
  subnet_id     = aws_subnet.public.id

  tags = {
    Name = "main-nat"
    Lab  = "lab-01"
  }

  depends_on = [aws_internet_gateway.main]
}

# Route Table for Public Subnet
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }

  tags = {
    Name = "public-rt"
    Lab  = "lab-01"
  }
}

# Route Table for Private Subnet
resource "aws_route_table" "private" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.main.id
  }

  tags = {
    Name = "private-rt"
    Lab  = "lab-01"
  }
}

# Route Table Associations
resource "aws_route_table_association" "public" {
  subnet_id      = aws_subnet.public.id
  route_table_id = aws_route_table.public.id
}

resource "aws_route_table_association" "private" {
  subnet_id      = aws_subnet.private.id
  route_table_id = aws_route_table.private.id
}

# Security Group for Public Instances
resource "aws_security_group" "public" {
  name        = "public-sg"
  description = "Security group for public instances"
  vpc_id      = aws_vpc.main.id

  ingress {
    description = "SSH"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

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
    Name = "public-sg"
    Lab  = "lab-01"
  }
}

# Security Group for Private Instances
resource "aws_security_group" "private" {
  name        = "private-sg"
  description = "Security group for private instances"
  vpc_id      = aws_vpc.main.id

  ingress {
    description = "SSH from public subnet"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["10.0.1.0/24"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "private-sg"
    Lab  = "lab-01"
  }
}

# EC2 Instance in Public Subnet
resource "aws_instance" "public" {
  ami           = "ami-0c02fb55956c7d316" # Amazon Linux 2
  instance_type = "t3.micro"
  subnet_id     = aws_subnet.public.id

  vpc_security_group_ids = [aws_security_group.public.id]
  key_name               = "your-key-pair-name" # Replace with your key pair

  user_data = <<-EOF
              #!/bin/bash
              yum update -y
              yum install -y httpd
              systemctl start httpd
              systemctl enable httpd
              echo "<h1>Hello from Public Instance!</h1>" > /var/www/html/index.html
              EOF

  tags = {
    Name = "public-instance"
    Lab  = "lab-01"
  }
}

# EC2 Instance in Private Subnet
resource "aws_instance" "private" {
  ami           = "ami-0c02fb55956c7d316" # Amazon Linux 2
  instance_type = "t3.micro"
  subnet_id     = aws_subnet.private.id

  vpc_security_group_ids = [aws_security_group.private.id]
  key_name               = "your-key-pair-name" # Replace with your key pair

  user_data = <<-EOF
              #!/bin/bash
              yum update -y
              yum install -y httpd
              systemctl start httpd
              systemctl enable httpd
              echo "<h1>Hello from Private Instance!</h1>" > /var/www/html/index.html
              EOF

  tags = {
    Name = "private-instance"
    Lab  = "lab-01"
  }
}
```

#### `outputs.tf`
```hcl
output "vpc_id" {
  description = "ID of the VPC"
  value       = aws_vpc.main.id
}

output "public_subnet_id" {
  description = "ID of the public subnet"
  value       = aws_subnet.public.id
}

output "private_subnet_id" {
  description = "ID of the private subnet"
  value       = aws_subnet.private.id
}

output "public_instance_public_ip" {
  description = "Public IP of the public instance"
  value       = aws_instance.public.public_ip
}

output "private_instance_private_ip" {
  description = "Private IP of the private instance"
  value       = aws_instance.private.private_ip
}
```

### Step 2: Deploy Infrastructure

```bash
# Initialize Terraform
terraform init

# Plan the deployment
terraform plan

# Apply the configuration
terraform apply
```

### Step 3: Test the Setup

1. **Test Public Instance Access**:
   ```bash
   # SSH to public instance
   ssh -i your-key.pem ec2-user@<public-instance-ip>
   
   # Test HTTP access
   curl http://<public-instance-ip>
   ```

2. **Test Private Instance Access**:
   ```bash
   # SSH to private instance through public instance
   ssh -i your-key.pem ec2-user@<public-instance-ip>
   ssh -i your-key.pem ec2-user@<private-instance-private-ip>
   ```

3. **Verify Internet Access**:
   ```bash
   # From private instance
   curl http://httpbin.org/ip
   ```

### Step 4: Security Verification

1. **Check Security Groups**:
   - Verify public instance allows SSH and HTTP from anywhere
   - Verify private instance only allows SSH from public subnet

2. **Test Network Isolation**:
   - Try to access private instance directly from internet (should fail)
   - Verify private instance can access internet through NAT Gateway

## ✅ Completion Checklist

- [ ] VPC created with CIDR 10.0.0.0/16
- [ ] Public subnet created in us-east-1a
- [ ] Private subnet created in us-east-1b
- [ ] Internet Gateway attached to VPC
- [ ] NAT Gateway deployed in public subnet
- [ ] Route tables configured correctly
- [ ] Security groups created and attached
- [ ] EC2 instances deployed in both subnets
- [ ] Public instance accessible from internet
- [ ] Private instance accessible only through public instance
- [ ] Private instance can access internet through NAT Gateway

## 🧪 Verification Exercises

1. **Network Connectivity Test**:
   ```bash
   # From your local machine
   ping <public-instance-ip>
   
   # From public instance
   ping <private-instance-private-ip>
   ```

2. **Security Group Validation**:
   - Try to SSH directly to private instance (should fail)
   - Verify HTTP access to public instance works
   - Verify private instance can download packages

3. **Cost Monitoring**:
   - Check AWS Cost Explorer for NAT Gateway charges
   - Monitor EC2 instance usage

## 🧹 Cleanup

```bash
# Destroy all resources
terraform destroy

# Verify cleanup
aws ec2 describe-vpcs --filters "Name=tag:Lab,Values=lab-01"
```

## 🔗 Related Resources

- [AWS VPC Documentation](https://docs.aws.amazon.com/vpc/)
- [Terraform AWS Provider](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)
- [AWS Security Groups](https://docs.aws.amazon.com/vpc/latest/userguide/VPC_SecurityGroups.html)
- [NAT Gateway Pricing](https://aws.amazon.com/vpc/pricing/)

## 🏆 Achievement Badge

**🏗️ VPC Architect**
*Successfully designed and deployed a secure AWS VPC with public and private subnets, implementing proper routing and security controls.*

## 📝 Lab Journal Entry

**Date**: [Your Date]
**Time Spent**: [Your Time]
**Difficulty**: Beginner
**Key Learnings**:
1. VPC provides network isolation and security
2. NAT Gateway enables private instances to access internet
3. Security groups control traffic at instance level
4. Route tables determine traffic flow between subnets

**Challenges**: [Document any issues you encountered]
**Next Steps**: Move to Lab 2 - Multi-AZ Application Load Balancer

---

**Congratulations!** You've successfully completed your first AWS infrastructure lab! 🎉 