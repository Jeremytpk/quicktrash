# 🚀 DevSecOps Quick Start Guide

## ⚡ Get Started in 30 Minutes

### Step 1: Environment Setup (10 minutes)

1. **Run the setup script**:
   ```bash
   cd "DevSecOps Engineer SAIC - 2506950"
   chmod +x setup-environment.sh
   ./setup-environment.sh
   ```

2. **Verify installations**:
   ```bash
   # Check AWS CLI
   aws --version
   
   # Check Terraform
   terraform --version
   
   # Check Docker
   docker --version
   
   # Check kubectl
   kubectl version --client
   ```

### Step 2: AWS Account Setup (10 minutes)

1. **Create AWS Account** (if you don't have one):
   - Go to [AWS Console](https://aws.amazon.com/)
   - Sign up for free tier account
   - Set up billing alerts

2. **Configure AWS CLI**:
   ```bash
   aws configure
   # Enter your Access Key ID
   # Enter your Secret Access Key
   # Enter region (us-east-1)
   # Enter output format (json)
   ```

3. **Create IAM User** (for better security):
   ```bash
   # Create IAM user with appropriate permissions
   aws iam create-user --user-name devsecops-lab
   aws iam attach-user-policy --user-name devsecops-lab --policy-arn arn:aws:iam::aws:policy/AdministratorAccess
   ```

### Step 3: Start Your First Lab (10 minutes)

1. **Navigate to Lab 1**:
   ```bash
   cd labs/lab-01-aws-vpc
   ```

2. **Review the lab**:
   - Read the README.md
   - Understand the learning objectives
   - Check prerequisites

3. **Begin the lab**:
   ```bash
   # Create Terraform files as described in the lab
   # Follow step-by-step instructions
   # Deploy your first VPC
   ```

---

## 🎯 Your First Week Plan

### Day 1: Foundation
- [ ] Complete environment setup
- [ ] Set up AWS account
- [ ] Start Lab 1: AWS VPC

### Day 2: Infrastructure
- [ ] Complete Lab 1
- [ ] Test VPC connectivity
- [ ] Document learnings in progress-tracker.md

### Day 3: CI/CD
- [ ] Start Lab 5: GitHub Actions
- [ ] Create GitHub repository
- [ ] Set up basic pipeline

### Day 4: Security
- [ ] Review security concepts
- [ ] Start Lab 17: AWS IAM
- [ ] Practice least privilege access

### Day 5: Integration
- [ ] Connect all components
- [ ] Test end-to-end workflow
- [ ] Plan next week's goals

---

## 📚 Essential Resources

### Documentation
- [AWS Documentation](https://docs.aws.amazon.com/)
- [Terraform Documentation](https://www.terraform.io/docs)
- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [Docker Documentation](https://docs.docker.com/)

### Learning Platforms
- [AWS Training](https://aws.amazon.com/training/)
- [HashiCorp Learn](https://learn.hashicorp.com/)
- [Kubernetes.io Tutorials](https://kubernetes.io/docs/tutorials/)
- [Docker Academy](https://academy.docker.com/)

### Community
- [AWS Community](https://aws.amazon.com/community/)
- [Terraform Community](https://www.terraform.io/community)
- [Kubernetes Community](https://kubernetes.io/community/)
- [DevSecOps Slack](https://devsecops-slack.herokuapp.com/)

---

## 🛠️ Common Commands

### AWS CLI
```bash
# List VPCs
aws ec2 describe-vpcs

# List EC2 instances
aws ec2 describe-instances

# List S3 buckets
aws s3 ls

# Check costs
aws ce get-cost-and-usage --time-period Start=2024-01-01,End=2024-01-31 --granularity MONTHLY --metrics BlendedCost
```

### Terraform
```bash
# Initialize
terraform init

# Plan changes
terraform plan

# Apply changes
terraform apply

# Destroy resources
terraform destroy

# Show state
terraform show
```

### Docker
```bash
# Build image
docker build -t myapp .

# Run container
docker run -p 8080:80 myapp

# List containers
docker ps

# View logs
docker logs <container-id>
```

### Kubernetes
```bash
# Get pods
kubectl get pods

# Describe pod
kubectl describe pod <pod-name>

# Apply manifest
kubectl apply -f manifest.yaml

# Port forward
kubectl port-forward <pod-name> 8080:80
```

---

## 🔧 Troubleshooting

### Common Issues

1. **AWS CLI not configured**:
   ```bash
   aws configure
   ```

2. **Terraform state locked**:
   ```bash
   terraform force-unlock <lock-id>
   ```

3. **Docker permission denied**:
   ```bash
   sudo usermod -aG docker $USER
   # Log out and back in
   ```

4. **Kubernetes context not set**:
   ```bash
   kubectl config get-contexts
   kubectl config use-context <context-name>
   ```

### Getting Help

1. **Check logs**:
   ```bash
   # AWS CloudTrail
   aws logs describe-log-groups
   
   # Terraform logs
   export TF_LOG=DEBUG
   
   # Docker logs
   docker logs <container-id>
   
   # Kubernetes logs
   kubectl logs <pod-name>
   ```

2. **Community Support**:
   - Stack Overflow
   - GitHub Issues
   - AWS Support Forums
   - HashiCorp Community

---

## 💡 Pro Tips

### Cost Management
- Set up AWS billing alerts
- Use AWS Cost Explorer
- Clean up resources after labs
- Use spot instances for testing

### Security Best Practices
- Use IAM roles instead of access keys
- Enable MFA on AWS account
- Follow least privilege principle
- Regularly rotate credentials

### Learning Efficiency
- Take notes during labs
- Practice hands-on exercises
- Join study groups
- Teach others what you learn

### Career Development
- Build a portfolio of projects
- Contribute to open source
- Network with professionals
- Stay updated with industry trends

---

## 🎉 Success Metrics

### Week 1 Goals
- [ ] Complete environment setup
- [ ] Deploy first VPC
- [ ] Understand basic AWS concepts
- [ ] Set up learning routine

### Month 1 Goals
- [ ] Complete Bronze level modules
- [ ] Earn first certification
- [ ] Build foundational infrastructure
- [ ] Join DevSecOps community

### 3-Month Goals
- [ ] Complete Silver level modules
- [ ] Earn intermediate certifications
- [ ] Build complex infrastructure
- [ ] Start contributing to open source

---

## 🚨 Emergency Contacts

### Technical Support
- AWS Support: [AWS Support Center](https://aws.amazon.com/support/)
- HashiCorp Support: [HashiCorp Support](https://support.hashicorp.com/)
- Docker Support: [Docker Support](https://www.docker.com/support/)

### Community Support
- Stack Overflow: [DevSecOps Tag](https://stackoverflow.com/questions/tagged/devsecops)
- Reddit: [r/devops](https://www.reddit.com/r/devops/)
- Discord: [DevSecOps Community](https://discord.gg/devsecops)

---

**Ready to start?** Run the setup script and begin your DevSecOps journey! 🚀

```bash
cd "DevSecOps Engineer SAIC - 2506950"
./setup-environment.sh
```

*Remember: The journey of a thousand miles begins with a single step. Start small, stay consistent, and keep learning!* 📚✨ 