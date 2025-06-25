# 🏆 AWS Fundamentals - Bronze Level

## 🎯 Learning Objectives

By the end of this module, you will be able to:
- Set up and manage AWS accounts with proper security
- Deploy and manage EC2 instances
- Create and configure VPCs and networking
- Implement S3 storage solutions
- Manage IAM users and permissions
- Monitor costs and optimize spending
- Use AWS CLI and SDKs effectively

## 🎮 Achievement Badges

- 🥉 **AWS Explorer** - Complete basic setup
- 🥉 **EC2 Master** - Deploy and manage instances
- 🥉 **Network Ninja** - Configure VPC and networking
- 🥉 **Storage Specialist** - Master S3 and storage
- 🥉 **Security Guardian** - Implement IAM best practices
- 🥉 **Cost Controller** - Optimize AWS spending

## 📋 Prerequisites

- Computer with internet access
- Credit card for AWS account (Free Tier available)
- Basic understanding of networking concepts
- Familiarity with command line interface

## 🚀 Module 1: AWS Account Setup

### Exercise 1.1: Create AWS Account
**Difficulty**: ⭐  
**Time**: 30 minutes  
**Cost**: $0 (Free Tier)

#### Steps:
1. **Visit AWS Console**
   - Go to https://aws.amazon.com/
   - Click "Create an AWS Account"

2. **Account Information**
   - Enter email address
   - Choose account name (e.g., "devsecops-learning")
   - Create strong password

3. **Contact Information**
   - Fill in personal details
   - Use real information for billing

4. **Payment Information**
   - Add credit card
   - AWS will charge $1 for verification (refunded)

5. **Identity Verification**
   - Choose phone or SMS verification
   - Enter verification code

6. **Support Plan**
   - Select "Free" plan for now
   - Can upgrade later if needed

#### 🎯 Learning Checkpoint:
- [ ] AWS account created successfully
- [ ] Can log into AWS Console
- [ ] Free Tier activated
- [ ] Billing alerts set up

### Exercise 1.2: Security Best Practices
**Difficulty**: ⭐⭐  
**Time**: 45 minutes  
**Cost**: $0

#### Steps:
1. **Enable MFA**
   - Go to IAM → Users → Your User
   - Enable MFA device
   - Use authenticator app (Google Authenticator)

2. **Create IAM User**
   - Create new IAM user for daily work
   - Attach AdministratorAccess policy
   - Generate access keys

3. **Set Up Billing Alerts**
   - Go to Billing → Billing Preferences
   - Set up CloudWatch billing alarms
   - Configure email notifications

4. **Enable CloudTrail**
   - Go to CloudTrail
   - Create trail for all regions
   - Send logs to S3 bucket

#### 🎯 Learning Checkpoint:
- [ ] MFA enabled on root account
- [ ] IAM user created with proper permissions
- [ ] Billing alerts configured
- [ ] CloudTrail logging enabled

## 🖥️ Module 2: EC2 Instance Management

### Exercise 2.1: Launch Your First EC2 Instance
**Difficulty**: ⭐⭐  
**Time**: 60 minutes  
**Cost**: $0 (Free Tier)

#### Steps:
1. **Launch Instance**
   - Go to EC2 Console
   - Click "Launch Instance"
   - Choose Amazon Linux 2 AMI
   - Select t2.micro (Free Tier eligible)

2. **Configure Instance**
   - Choose instance type: t2.micro
   - Configure security group (allow SSH)
   - Create or select key pair
   - Launch instance

3. **Connect to Instance**
   ```bash
   # Download key pair
   chmod 400 your-key.pem
   ssh -i your-key.pem ec2-user@your-instance-ip
   ```

4. **Basic Commands**
   ```bash
   # Update system
   sudo yum update -y
   
   # Install web server
   sudo yum install httpd -y
   sudo systemctl start httpd
   sudo systemctl enable httpd
   
   # Create simple webpage
   echo "<h1>Hello from AWS!</h1>" | sudo tee /var/www/html/index.html
   ```

#### 🎯 Learning Checkpoint:
- [ ] EC2 instance launched successfully
- [ ] Can SSH into instance
- [ ] Web server running and accessible
- [ ] Understand instance lifecycle

### Exercise 2.2: Auto Scaling Group
**Difficulty**: ⭐⭐⭐  
**Time**: 90 minutes  
**Cost**: $0-5 (Free Tier + minimal scaling)

#### Steps:
1. **Create Launch Template**
   - Go to EC2 → Launch Templates
   - Create template from existing instance
   - Configure user data for web server

2. **Create Auto Scaling Group**
   - Go to EC2 → Auto Scaling Groups
   - Create group with 1-3 instances
   - Configure scaling policies

3. **Test Auto Scaling**
   - Simulate load on instances
   - Monitor scaling activities
   - Verify new instances launch

#### 🎯 Learning Checkpoint:
- [ ] Launch template created
- [ ] Auto scaling group configured
- [ ] Scaling policies working
- [ ] Can handle load changes

## 🌐 Module 3: Networking (VPC)

### Exercise 3.1: Create Custom VPC
**Difficulty**: ⭐⭐⭐  
**Time**: 120 minutes  
**Cost**: $0-2

#### Steps:
1. **Design VPC Architecture**
   ```
   VPC: 10.0.0.0/16
   ├── Public Subnet 1: 10.0.1.0/24 (us-east-1a)
   ├── Public Subnet 2: 10.0.2.0/24 (us-east-1b)
   ├── Private Subnet 1: 10.0.3.0/24 (us-east-1a)
   └── Private Subnet 2: 10.0.4.0/24 (us-east-1b)
   ```

2. **Create VPC**
   - Go to VPC Console
   - Create VPC with custom CIDR
   - Enable DNS hostnames

3. **Create Subnets**
   - Create public subnets in different AZs
   - Create private subnets in different AZs
   - Configure route tables

4. **Internet Gateway**
   - Attach internet gateway to VPC
   - Update route table for public subnets

5. **NAT Gateway**
   - Create NAT gateway in public subnet
   - Update route table for private subnets

#### 🎯 Learning Checkpoint:
- [ ] VPC created with proper CIDR
- [ ] Public and private subnets configured
- [ ] Internet connectivity working
- [ ] Private instances can access internet

### Exercise 3.2: Security Groups and NACLs
**Difficulty**: ⭐⭐⭐  
**Time**: 90 minutes  
**Cost**: $0

#### Steps:
1. **Create Security Groups**
   - Web server SG (ports 80, 443, 22)
   - Database SG (port 3306)
   - Application SG (custom ports)

2. **Configure Network ACLs**
   - Create NACL for public subnets
   - Create NACL for private subnets
   - Configure inbound/outbound rules

3. **Test Security**
   - Launch instances with different SGs
   - Test connectivity between instances
   - Verify security rules working

#### 🎯 Learning Checkpoint:
- [ ] Security groups configured properly
- [ ] NACLs implemented
- [ ] Can control traffic flow
- [ ] Understand security layers

## 💾 Module 4: Storage (S3)

### Exercise 4.1: S3 Bucket Management
**Difficulty**: ⭐⭐  
**Time**: 60 minutes  
**Cost**: $0 (Free Tier)

#### Steps:
1. **Create S3 Bucket**
   - Go to S3 Console
   - Create bucket with unique name
   - Choose region close to you
   - Configure versioning

2. **Upload and Manage Objects**
   ```bash
   # Upload file via CLI
   aws s3 cp local-file.txt s3://your-bucket-name/
   
   # List objects
   aws s3 ls s3://your-bucket-name/
   
   # Download file
   aws s3 cp s3://your-bucket-name/file.txt ./
   ```

3. **Configure Bucket Policy**
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Sid": "PublicReadGetObject",
         "Effect": "Allow",
         "Principal": "*",
         "Action": "s3:GetObject",
         "Resource": "arn:aws:s3:::your-bucket-name/*"
       }
     ]
   }
   ```

#### 🎯 Learning Checkpoint:
- [ ] S3 bucket created
- [ ] Can upload/download objects
- [ ] Bucket policy configured
- [ ] Versioning enabled

### Exercise 4.2: S3 Lifecycle Management
**Difficulty**: ⭐⭐⭐  
**Time**: 45 minutes  
**Cost**: $0-1

#### Steps:
1. **Configure Lifecycle Rules**
   - Move objects to IA after 30 days
   - Move to Glacier after 90 days
   - Delete after 365 days

2. **Test Lifecycle**
   - Upload test files
   - Monitor transitions
   - Verify cost savings

#### 🎯 Learning Checkpoint:
- [ ] Lifecycle rules configured
- [ ] Understand storage classes
- [ ] Can optimize costs
- [ ] Monitor transitions

## 🔐 Module 5: Identity and Access Management (IAM)

### Exercise 5.1: IAM Users and Groups
**Difficulty**: ⭐⭐  
**Time**: 60 minutes  
**Cost**: $0

#### Steps:
1. **Create IAM Groups**
   - Developers group
   - Administrators group
   - ReadOnly group

2. **Create IAM Users**
   - Create users for different roles
   - Assign users to groups
   - Generate access keys

3. **Test Permissions**
   - Login as different users
   - Test access to services
   - Verify restrictions

#### 🎯 Learning Checkpoint:
- [ ] IAM groups created
- [ ] Users assigned to groups
- [ ] Permissions working correctly
- [ ] Can control access

### Exercise 5.2: IAM Roles and Policies
**Difficulty**: ⭐⭐⭐  
**Time**: 90 minutes  
**Cost**: $0

#### Steps:
1. **Create Custom Policies**
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Effect": "Allow",
         "Action": [
           "s3:GetObject",
           "s3:PutObject"
         ],
         "Resource": "arn:aws:s3:::your-bucket-name/*"
       }
     ]
   }
   ```

2. **Create IAM Roles**
   - EC2 role for S3 access
   - Lambda role for DynamoDB
   - Cross-account role

3. **Attach Roles to Resources**
   - Attach role to EC2 instance
   - Test access to S3
   - Monitor CloudTrail logs

#### 🎯 Learning Checkpoint:
- [ ] Custom policies created
- [ ] IAM roles configured
- [ ] Roles attached to resources
- [ ] Understand least privilege

## 📊 Module 6: Monitoring and Cost Management

### Exercise 6.1: CloudWatch Monitoring
**Difficulty**: ⭐⭐  
**Time**: 60 minutes  
**Cost**: $0-1

#### Steps:
1. **Set Up CloudWatch**
   - Enable detailed monitoring on EC2
   - Create custom metrics
   - Set up dashboards

2. **Create Alarms**
   - CPU utilization alarm
   - Memory usage alarm
   - Billing alarm

3. **Monitor Logs**
   - Send application logs to CloudWatch
   - Create log groups and streams
   - Set up log filters

#### 🎯 Learning Checkpoint:
- [ ] CloudWatch monitoring enabled
- [ ] Custom metrics created
- [ ] Alarms configured
- [ ] Can monitor resources

### Exercise 6.2: Cost Optimization
**Difficulty**: ⭐⭐⭐  
**Time**: 90 minutes  
**Cost**: $0

#### Steps:
1. **Analyze Costs**
   - Use Cost Explorer
   - Identify high-cost services
   - Review unused resources

2. **Implement Savings**
   - Use Reserved Instances
   - Enable S3 lifecycle policies
   - Optimize storage classes

3. **Set Up Budgets**
   - Create monthly budget
   - Set up alerts
   - Monitor spending

#### 🎯 Learning Checkpoint:
- [ ] Cost analysis completed
- [ ] Optimization implemented
- [ ] Budgets configured
- [ ] Can control spending

## 🛠️ Module 7: AWS CLI and SDKs

### Exercise 7.1: AWS CLI Setup
**Difficulty**: ⭐⭐  
**Time**: 45 minutes  
**Cost**: $0

#### Steps:
1. **Install AWS CLI**
   ```bash
   # macOS
   brew install awscli
   
   # Linux
   curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
   unzip awscliv2.zip
   sudo ./aws/install
   ```

2. **Configure AWS CLI**
   ```bash
   aws configure
   # Enter your access key, secret key, region
   ```

3. **Basic Commands**
   ```bash
   # List S3 buckets
   aws s3 ls
   
   # List EC2 instances
   aws ec2 describe-instances
   
   # Create S3 bucket
   aws s3 mb s3://my-unique-bucket-name
   ```

#### 🎯 Learning Checkpoint:
- [ ] AWS CLI installed
- [ ] Configuration working
- [ ] Can run basic commands
- [ ] Understand CLI syntax

### Exercise 7.2: Python SDK (Boto3)
**Difficulty**: ⭐⭐⭐  
**Time**: 60 minutes  
**Cost**: $0

#### Steps:
1. **Install Boto3**
   ```bash
   pip install boto3
   ```

2. **Create Python Script**
   ```python
   import boto3
   
   # Create EC2 client
   ec2 = boto3.client('ec2')
   
   # List instances
   response = ec2.describe_instances()
   for reservation in response['Reservations']:
       for instance in reservation['Instances']:
           print(f"Instance ID: {instance['InstanceId']}")
           print(f"State: {instance['State']['Name']}")
   ```

3. **Automate Tasks**
   - Create script to start/stop instances
   - Backup S3 buckets
   - Monitor costs

#### 🎯 Learning Checkpoint:
- [ ] Boto3 installed
- [ ] Can create Python scripts
- [ ] Automate AWS tasks
- [ ] Understand SDK usage

## 🎯 Final Project: Multi-Tier Application

### Project Overview
Deploy a complete web application with the following components:
- **Web Tier**: EC2 instances in public subnets
- **Application Tier**: EC2 instances in private subnets
- **Database Tier**: RDS instance in private subnet
- **Storage**: S3 for static content
- **Load Balancer**: ALB for traffic distribution

### Requirements
1. **Infrastructure Setup**
   - Custom VPC with public/private subnets
   - Security groups for each tier
   - Internet and NAT gateways

2. **Application Deployment**
   - Deploy web application
   - Configure database connection
   - Set up load balancer

3. **Monitoring and Security**
   - Enable CloudWatch monitoring
   - Configure logging
   - Implement security best practices

### Deliverables
- [ ] Complete infrastructure diagram
- [ ] Working application deployment
- [ ] Monitoring and alerting setup
- [ ] Cost optimization report
- [ ] Security assessment

## 🏆 Bronze Level Completion

### Requirements for Bronze Badge:
- [ ] Complete all exercises in Modules 1-7
- [ ] Deploy final project successfully
- [ ] Achieve 80% on knowledge assessment
- [ ] Document all learnings and challenges
- [ ] Create cost optimization plan

### Next Steps:
- Move to **Silver Level**: Terraform Mastery
- Continue with **Kubernetes Clusters**
- Start **CI/CD Pipelines** module

## 📚 Additional Resources

### Free Learning Resources:
- [AWS Free Tier](https://aws.amazon.com/free/)
- [AWS Documentation](https://docs.aws.amazon.com/)
- [AWS Training](https://aws.amazon.com/training/)
- [AWS YouTube Channel](https://www.youtube.com/user/AmazonWebServices)

### Recommended Certifications:
- AWS Solutions Architect Associate ($150)
- AWS Developer Associate ($150)
- AWS SysOps Administrator Associate ($150)

### Practice Platforms:
- [AWS Skill Builder](https://skillbuilder.aws/)
- [AWS Cloud Quest](https://aws.amazon.com/cloudquest/)
- [AWS Well-Architected Labs](https://wellarchitectedlabs.com/)

---

**🎉 Congratulations! You've completed the AWS Fundamentals module! 🎉**

*Ready to move to the next level? Let's tackle Terraform and Infrastructure as Code!* 