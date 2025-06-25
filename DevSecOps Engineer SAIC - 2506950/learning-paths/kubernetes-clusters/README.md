# 🥈 Kubernetes Clusters - Silver Level

## 🎯 Learning Objectives

By the end of this module, you will be able to:
- Deploy and manage EKS clusters on AWS
- Understand Kubernetes architecture and components
- Deploy applications using manifests and Helm
- Implement monitoring and logging solutions
- Configure networking and security policies
- Automate cluster operations with CI/CD
- Troubleshoot common Kubernetes issues

## 🎮 Achievement Badges

- 🥈 **Kubernetes Novice** - Basic cluster operations
- 🥈 **EKS Master** - AWS EKS cluster management
- 🥈 **Application Deployer** - Deploy and manage applications
- 🥈 **Helm Chart Expert** - Package and deploy with Helm
- 🥈 **Monitoring Specialist** - Implement observability
- 🥈 **Security Practitioner** - Kubernetes security best practices

## 📋 Prerequisites

- Completed AWS Fundamentals (Bronze Level)
- Basic understanding of containers and Docker
- Familiarity with YAML syntax
- AWS CLI configured with appropriate permissions

## 🚀 Module 1: Kubernetes Fundamentals

### Exercise 1.1: Local Kubernetes Setup
**Difficulty**: ⭐⭐  
**Time**: 60 minutes  
**Cost**: $0

#### Steps:
1. **Install kubectl**
   ```bash
   # macOS
   brew install kubectl
   
   # Linux
   curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
   chmod +x kubectl
   sudo mv kubectl /usr/local/bin/
   
   # Windows
   # Download from https://kubernetes.io/docs/tasks/tools/install-kubectl-windows/
   ```

2. **Install Minikube**
   ```bash
   # macOS
   brew install minikube
   
   # Linux
   curl -LO https://storage.googleapis.com/minikube/releases/latest/minikube-linux-amd64
   sudo install minikube-linux-amd64 /usr/local/bin/minikube
   
   # Windows
   # Download from https://minikube.sigs.k8s.io/docs/start/
   ```

3. **Start Local Cluster**
   ```bash
   # Start Minikube
   minikube start --driver=docker
   
   # Verify cluster is running
   kubectl cluster-info
   kubectl get nodes
   
   # Enable addons
   minikube addons enable ingress
   minikube addons enable metrics-server
   ```

4. **Basic kubectl Commands**
   ```bash
   # Get cluster information
   kubectl cluster-info
   
   # List nodes
   kubectl get nodes
   
   # List namespaces
   kubectl get namespaces
   
   # Get all resources
   kubectl get all --all-namespaces
   ```

#### 🎯 Learning Checkpoint:
- [ ] kubectl installed and working
- [ ] Minikube cluster running
- [ ] Can run basic kubectl commands
- [ ] Understand cluster components

### Exercise 1.2: Kubernetes Architecture
**Difficulty**: ⭐⭐  
**Time**: 90 minutes  
**Cost**: $0

#### Steps:
1. **Understand Control Plane Components**
   ```bash
   # View control plane pods
   kubectl get pods -n kube-system
   
   # Describe API server
   kubectl describe pod kube-apiserver-minikube -n kube-system
   
   # Check etcd
   kubectl describe pod etcd-minikube -n kube-system
   ```

2. **Explore Node Components**
   ```bash
   # Get node details
   kubectl describe node minikube
   
   # View kubelet logs
   minikube ssh "sudo journalctl -u kubelet"
   
   # Check container runtime
   minikube ssh "sudo crictl info"
   ```

3. **Network Components**
   ```bash
   # Check CNI
   kubectl get pods -n kube-system | grep cni
   
   # View network policies
   kubectl get networkpolicies --all-namespaces
   
   # Check DNS
   kubectl get pods -n kube-system | grep dns
   ```

#### 🎯 Learning Checkpoint:
- [ ] Understand control plane components
- [ ] Know node components
- [ ] Understand networking basics
- [ ] Can troubleshoot basic issues

## ☁️ Module 2: AWS EKS Cluster

### Exercise 2.1: Create EKS Cluster
**Difficulty**: ⭐⭐⭐  
**Time**: 120 minutes  
**Cost**: $0-5 (Free Tier)

#### Steps:
1. **Install eksctl**
   ```bash
   # macOS
   brew tap weaveworks/tap
   brew install weaveworks/tap/eksctl
   
   # Linux
   curl --silent --location "https://github.com/weaveworks/eksctl/releases/latest/download/eksctl_$(uname -s)_amd64.tar.gz" | tar xz -C /tmp
   sudo mv /tmp/eksctl /usr/local/bin
   
   # Windows
   # Download from https://github.com/weaveworks/eksctl/releases
   ```

2. **Create EKS Cluster**
   ```bash
   # Create cluster configuration
   cat << EOF > cluster.yaml
   apiVersion: eksctl.io/v1alpha5
   kind: ClusterConfig
   
   metadata:
     name: devsecops-cluster
     region: us-east-1
     version: '1.28'
   
   nodeGroups:
     - name: ng-1
       instanceType: t3.medium
       desiredCapacity: 2
       minSize: 1
       maxSize: 3
       volumeSize: 20
       ssh:
         allow: true
         publicKeyName: your-key-pair-name
   
   iam:
     withOIDC: true
   
   addons:
     - name: vpc-cni
       version: latest
     - name: coredns
       version: latest
     - name: kube-proxy
       version: latest
     - name: aws-ebs-csi-driver
       version: latest
   EOF
   
   # Create cluster
   eksctl create cluster -f cluster.yaml
   ```

3. **Configure kubectl**
   ```bash
   # Update kubeconfig
   aws eks update-kubeconfig --region us-east-1 --name devsecops-cluster
   
   # Verify connection
   kubectl cluster-info
   kubectl get nodes
   ```

4. **Install AWS Load Balancer Controller**
   ```bash
   # Install cert-manager
   kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.12.0/cert-manager.yaml
   
   # Install AWS Load Balancer Controller
   kubectl apply -k "github.com/aws/eks-charts/stable/aws-load-balancer-controller//crds?ref=master"
   
   # Create IAM policy
   aws iam create-policy \
       --policy-name AWSLoadBalancerControllerIAMPolicy \
       --policy-document file://aws-load-balancer-controller-policy.json
   
   # Create service account
   eksctl create iamserviceaccount \
     --cluster=devsecops-cluster \
     --namespace=kube-system \
     --name=aws-load-balancer-controller \
     --attach-policy-arn=arn:aws:iam::YOUR_ACCOUNT_ID:policy/AWSLoadBalancerControllerIAMPolicy \
     --approve
   
   # Install controller
   helm repo add eks https://aws.github.io/eks-charts
   helm install aws-load-balancer-controller eks/aws-load-balancer-controller \
     -n kube-system \
     --set clusterName=devsecops-cluster \
     --set serviceAccount.create=false \
     --set serviceAccount.name=aws-load-balancer-controller
   ```

#### 🎯 Learning Checkpoint:
- [ ] EKS cluster created successfully
- [ ] kubectl configured for EKS
- [ ] Load balancer controller installed
- [ ] Can access cluster from local machine

### Exercise 2.2: Cluster Scaling and Management
**Difficulty**: ⭐⭐⭐  
**Time**: 90 minutes  
**Cost**: $0-10

#### Steps:
1. **Scale Node Groups**
   ```bash
   # Scale existing node group
   eksctl scale nodegroup --cluster=devsecops-cluster --name=ng-1 --nodes=3
   
   # Add new node group
   eksctl create nodegroup \
     --cluster=devsecops-cluster \
     --region=us-east-1 \
     --name=ng-spot \
     --node-type=t3.medium \
     --nodes=2 \
     --nodes-min=1 \
     --nodes-max=5 \
     --spot
   ```

2. **Cluster Autoscaler**
   ```bash
   # Install cluster autoscaler
   kubectl apply -f https://raw.githubusercontent.com/kubernetes/autoscaler/master/cluster-autoscaler/cloudprovider/aws/examples/cluster-autoscaler-autodiscover.yaml
   
   # Edit deployment to match your cluster
   kubectl -n kube-system edit deployment.apps/cluster-autoscaler
   # Update --node-group-auto-discovery=asg:tag=k8s.io/cluster-autoscaler/enabled,k8s.io/cluster-autoscaler/devsecops-cluster
   ```

3. **Horizontal Pod Autoscaler**
   ```yaml
   # hpa.yaml
   apiVersion: autoscaling/v2
   kind: HorizontalPodAutoscaler
   metadata:
     name: web-app-hpa
   spec:
     scaleTargetRef:
       apiVersion: apps/v1
       kind: Deployment
       name: web-app
     minReplicas: 2
     maxReplicas: 10
     metrics:
     - type: Resource
       resource:
         name: cpu
         target:
           type: Utilization
           averageUtilization: 70
   ```

#### 🎯 Learning Checkpoint:
- [ ] Can scale node groups
- [ ] Cluster autoscaler working
- [ ] HPA configured
- [ ] Understand scaling mechanisms

## 📦 Module 3: Application Deployment

### Exercise 3.1: Deploy Simple Application
**Difficulty**: ⭐⭐  
**Time**: 60 minutes  
**Cost**: $0-2

#### Steps:
1. **Create Namespace**
   ```bash
   kubectl create namespace devsecops-app
   kubectl config set-context --current --namespace=devsecops-app
   ```

2. **Deploy Application**
   ```yaml
   # deployment.yaml
   apiVersion: apps/v1
   kind: Deployment
   metadata:
     name: web-app
     labels:
       app: web-app
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
           resources:
             requests:
               memory: "64Mi"
               cpu: "250m"
             limits:
               memory: "128Mi"
               cpu: "500m"
           livenessProbe:
             httpGet:
               path: /
               port: 80
             initialDelaySeconds: 30
             periodSeconds: 10
           readinessProbe:
             httpGet:
               path: /
               port: 80
             initialDelaySeconds: 5
             periodSeconds: 5
   ```

3. **Create Service**
   ```yaml
   # service.yaml
   apiVersion: v1
   kind: Service
   metadata:
     name: web-app-service
   spec:
     selector:
       app: web-app
     ports:
     - protocol: TCP
       port: 80
       targetPort: 80
     type: ClusterIP
   ```

4. **Create Ingress**
   ```yaml
   # ingress.yaml
   apiVersion: networking.k8s.io/v1
   kind: Ingress
   metadata:
     name: web-app-ingress
     annotations:
       kubernetes.io/ingress.class: alb
       alb.ingress.kubernetes.io/scheme: internet-facing
       alb.ingress.kubernetes.io/target-type: ip
   spec:
     rules:
     - host: devsecops.example.com
       http:
         paths:
         - path: /
           pathType: Prefix
           backend:
             service:
               name: web-app-service
               port:
                 number: 80
   ```

5. **Deploy Application**
   ```bash
   kubectl apply -f deployment.yaml
   kubectl apply -f service.yaml
   kubectl apply -f ingress.yaml
   
   # Check status
   kubectl get pods
   kubectl get services
   kubectl get ingress
   ```

#### 🎯 Learning Checkpoint:
- [ ] Application deployed successfully
- [ ] Service accessible
- [ ] Ingress working
- [ ] Can access application externally

### Exercise 3.2: Multi-Tier Application
**Difficulty**: ⭐⭐⭐⭐  
**Time**: 120 minutes  
**Cost**: $0-5

#### Steps:
1. **Database Deployment**
   ```yaml
   # postgres-deployment.yaml
   apiVersion: apps/v1
   kind: Deployment
   metadata:
     name: postgres
   spec:
     replicas: 1
     selector:
       matchLabels:
         app: postgres
     template:
       metadata:
         labels:
           app: postgres
       spec:
         containers:
         - name: postgres
           image: postgres:13
           env:
           - name: POSTGRES_DB
             value: "myapp"
           - name: POSTGRES_USER
             value: "myapp"
           - name: POSTGRES_PASSWORD
             valueFrom:
               secretKeyRef:
                 name: postgres-secret
                 key: password
           ports:
           - containerPort: 5432
           volumeMounts:
           - name: postgres-storage
             mountPath: /var/lib/postgresql/data
         volumes:
         - name: postgres-storage
           persistentVolumeClaim:
             claimName: postgres-pvc
   ```

2. **Persistent Volume**
   ```yaml
   # pvc.yaml
   apiVersion: v1
   kind: PersistentVolumeClaim
   metadata:
     name: postgres-pvc
   spec:
     accessModes:
       - ReadWriteOnce
     resources:
       requests:
         storage: 10Gi
     storageClassName: gp2
   ```

3. **Secrets**
   ```bash
   # Create secret
   kubectl create secret generic postgres-secret \
     --from-literal=password=mysecretpassword
   ```

4. **Application with Database**
   ```yaml
   # app-deployment.yaml
   apiVersion: apps/v1
   kind: Deployment
   metadata:
     name: app
   spec:
     replicas: 3
     selector:
       matchLabels:
         app: app
     template:
       metadata:
         labels:
           app: app
       spec:
         containers:
         - name: app
           image: your-app-image:latest
           env:
           - name: DATABASE_URL
             value: "postgresql://myapp:mysecretpassword@postgres-service:5432/myapp"
           ports:
           - containerPort: 8080
   ```

#### 🎯 Learning Checkpoint:
- [ ] Multi-tier application deployed
- [ ] Database with persistent storage
- [ ] Secrets management
- [ ] Service communication working

## 📊 Module 4: Helm Charts

### Exercise 4.1: Install and Use Helm
**Difficulty**: ⭐⭐  
**Time**: 60 minutes  
**Cost**: $0-2

#### Steps:
1. **Install Helm**
   ```bash
   # macOS
   brew install helm
   
   # Linux
   curl https://get.helm.sh/helm-v3.12.0-linux-amd64.tar.gz | tar xz
   sudo mv linux-amd64/helm /usr/local/bin/
   
   # Windows
   # Download from https://github.com/helm/helm/releases
   ```

2. **Add Repositories**
   ```bash
   # Add official repositories
   helm repo add stable https://charts.helm.sh/stable
   helm repo add bitnami https://charts.bitnami.com/bitnami
   helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
   
   # Update repositories
   helm repo update
   ```

3. **Install Applications**
   ```bash
   # Install nginx-ingress
   helm install nginx-ingress ingress-nginx/ingress-nginx \
     --namespace ingress-nginx \
     --create-namespace
   
   # Install Prometheus
   helm install prometheus prometheus-community/kube-prometheus-stack \
     --namespace monitoring \
     --create-namespace
   
   # Install Grafana
   helm install grafana bitnami/grafana \
     --namespace monitoring \
     --set admin.password=admin123
   ```

4. **Create Custom Chart**
   ```bash
   # Create new chart
   helm create my-app
   
   # Structure
   my-app/
   ├── Chart.yaml
   ├── values.yaml
   ├── charts/
   ├── templates/
   │   ├── deployment.yaml
   │   ├── service.yaml
   │   ├── ingress.yaml
   │   └── _helpers.tpl
   └── .helmignore
   ```

#### 🎯 Learning Checkpoint:
- [ ] Helm installed and working
- [ ] Can install charts from repositories
- [ ] Understand chart structure
- [ ] Can create custom charts

### Exercise 4.2: Custom Helm Chart
**Difficulty**: ⭐⭐⭐⭐  
**Time**: 120 minutes  
**Cost**: $0-2

#### Steps:
1. **Create Chart Structure**
   ```bash
   helm create devsecops-app
   cd devsecops-app
   ```

2. **Customize Chart.yaml**
   ```yaml
   # Chart.yaml
   apiVersion: v2
   name: devsecops-app
   description: A Helm chart for DevSecOps application
   type: application
   version: 0.1.0
   appVersion: "1.0.0"
   ```

3. **Update values.yaml**
   ```yaml
   # values.yaml
   replicaCount: 3
   
   image:
     repository: nginx
     pullPolicy: IfNotPresent
     tag: "latest"
   
   imagePullSecrets: []
   nameOverride: ""
   fullnameOverride: ""
   
   serviceAccount:
     create: true
     annotations: {}
     name: ""
   
   service:
     type: ClusterIP
     port: 80
   
   ingress:
     enabled: true
     className: "alb"
     annotations:
       kubernetes.io/ingress.class: alb
       alb.ingress.kubernetes.io/scheme: internet-facing
     hosts:
       - host: devsecops.example.com
         paths:
           - path: /
             pathType: Prefix
     tls: []
   
   resources:
     limits:
       cpu: 500m
       memory: 512Mi
     requests:
       cpu: 250m
       memory: 256Mi
   
   autoscaling:
     enabled: true
     minReplicas: 2
     maxReplicas: 10
     targetCPUUtilizationPercentage: 80
   ```

4. **Customize Templates**
   ```yaml
   # templates/deployment.yaml
   apiVersion: apps/v1
   kind: Deployment
   metadata:
     name: {{ include "devsecops-app.fullname" . }}
     labels:
       {{- include "devsecops-app.labels" . | nindent 6 }}
   spec:
     {{- if not .Values.autoscaling.enabled }}
     replicas: {{ .Values.replicaCount }}
     {{- end }}
     selector:
       matchLabels:
         {{- include "devsecops-app.selectorLabels" . | nindent 8 }}
     template:
       metadata:
         labels:
           {{- include "devsecops-app.selectorLabels" . | nindent 10 }}
       spec:
         containers:
           - name: {{ .Chart.Name }}
             image: "{{ .Values.image.repository }}:{{ .Values.image.tag | default .Chart.AppVersion }}"
             imagePullPolicy: {{ .Values.image.pullPolicy }}
             ports:
               - name: http
                 containerPort: 80
                 protocol: TCP
             livenessProbe:
               httpGet:
                 path: /
                 port: http
             readinessProbe:
               httpGet:
                 path: /
                 port: http
             resources:
               {{- toYaml .Values.resources | nindent 12 }}
   ```

5. **Package and Deploy**
   ```bash
   # Package chart
   helm package .
   
   # Install chart
   helm install devsecops-app ./devsecops-app-0.1.0.tgz \
     --namespace devsecops-app \
     --create-namespace
   
   # Upgrade chart
   helm upgrade devsecops-app ./devsecops-app-0.1.0.tgz \
     --namespace devsecops-app
   ```

#### 🎯 Learning Checkpoint:
- [ ] Custom chart created
- [ ] Templates customized
- [ ] Values properly configured
- [ ] Can package and deploy

## 📈 Module 5: Monitoring and Observability

### Exercise 5.1: Prometheus and Grafana
**Difficulty**: ⭐⭐⭐⭐  
**Time**: 120 minutes  
**Cost**: $0-5

#### Steps:
1. **Install Prometheus Stack**
   ```bash
   # Add Prometheus repository
   helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
   helm repo update
   
   # Install Prometheus
   helm install prometheus prometheus-community/kube-prometheus-stack \
     --namespace monitoring \
     --create-namespace \
     --set grafana.enabled=true \
     --set prometheus.prometheusSpec.serviceMonitorSelectorNilUsesHelmValues=false
   ```

2. **Configure Service Monitors**
   ```yaml
   # servicemonitor.yaml
   apiVersion: monitoring.coreos.com/v1
   kind: ServiceMonitor
   metadata:
     name: web-app-monitor
     namespace: monitoring
   spec:
     selector:
       matchLabels:
         app: web-app
     endpoints:
     - port: http
       interval: 30s
   ```

3. **Create Grafana Dashboards**
   ```yaml
   # dashboard.yaml
   apiVersion: v1
   kind: ConfigMap
   metadata:
     name: grafana-dashboard
     namespace: monitoring
   data:
     dashboard.json: |
       {
         "dashboard": {
           "title": "Kubernetes Cluster",
           "panels": [
             {
               "title": "CPU Usage",
               "type": "graph",
               "targets": [
                 {
                   "expr": "sum(rate(container_cpu_usage_seconds_total{container!=\"\"}[5m])) by (pod)"
                 }
               ]
             }
           ]
         }
       }
   ```

4. **Access Grafana**
   ```bash
   # Get Grafana password
   kubectl get secret --namespace monitoring prometheus-grafana -o jsonpath="{.data.admin-password}" | base64 --decode
   
   # Port forward to access Grafana
   kubectl port-forward --namespace monitoring svc/prometheus-grafana 3000:80
   ```

#### 🎯 Learning Checkpoint:
- [ ] Prometheus installed and configured
- [ ] Service monitors working
- [ ] Grafana dashboards created
- [ ] Can monitor cluster metrics

### Exercise 5.2: Logging with ELK Stack
**Difficulty**: ⭐⭐⭐⭐  
**Time**: 150 minutes  
**Cost**: $0-10

#### Steps:
1. **Install Elasticsearch**
   ```bash
   # Add Elastic repository
   helm repo add elastic https://helm.elastic.co
   helm repo update
   
   # Install Elasticsearch
   helm install elasticsearch elastic/elasticsearch \
     --namespace logging \
     --create-namespace \
     --set replicas=1 \
     --set minimumMasterNodes=1
   ```

2. **Install Kibana**
   ```bash
   helm install kibana elastic/kibana \
     --namespace logging \
     --set elasticsearchHosts=http://elasticsearch-master:9200
   ```

3. **Install Filebeat**
   ```bash
   helm install filebeat elastic/filebeat \
     --namespace logging \
     --set daemonset.enabled=true \
     --set daemonset.filebeatConfig.filebeat\.yml=|
       filebeat.inputs:
       - type: container
         paths:
         - /var/log/containers/*.log
       output.elasticsearch:
         hosts: ["elasticsearch-master:9200"]
   ```

4. **Configure Log Aggregation**
   ```yaml
   # fluentd-config.yaml
   apiVersion: v1
   kind: ConfigMap
   metadata:
     name: fluentd-config
     namespace: logging
   data:
     fluent.conf: |
       <source>
         @type tail
         path /var/log/containers/*.log
         pos_file /var/log/fluentd-containers.log.pos
         tag kubernetes.*
         read_from_head true
         <parse>
           @type json
           time_format %Y-%m-%dT%H:%M:%S.%NZ
         </parse>
       </source>
       
       <match kubernetes.**>
         @type elasticsearch
         host elasticsearch-master
         port 9200
         logstash_format true
         logstash_prefix k8s
       </match>
   ```

#### 🎯 Learning Checkpoint:
- [ ] ELK stack deployed
- [ ] Log aggregation working
- [ ] Can search logs in Kibana
- [ ] Understand log flow

## 🔒 Module 6: Security and RBAC

### Exercise 6.1: RBAC Configuration
**Difficulty**: ⭐⭐⭐  
**Time**: 90 minutes  
**Cost**: $0

#### Steps:
1. **Create Service Account**
   ```yaml
   # serviceaccount.yaml
   apiVersion: v1
   kind: ServiceAccount
   metadata:
     name: app-service-account
     namespace: devsecops-app
   ```

2. **Create Role**
   ```yaml
   # role.yaml
   apiVersion: rbac.authorization.k8s.io/v1
   kind: Role
   metadata:
     namespace: devsecops-app
     name: app-role
   rules:
   - apiGroups: [""]
     resources: ["pods", "services"]
     verbs: ["get", "list", "watch"]
   - apiGroups: ["apps"]
     resources: ["deployments"]
     verbs: ["get", "list", "watch", "update"]
   ```

3. **Create RoleBinding**
   ```yaml
   # rolebinding.yaml
   apiVersion: rbac.authorization.k8s.io/v1
   kind: RoleBinding
   metadata:
     name: app-role-binding
     namespace: devsecops-app
   subjects:
   - kind: ServiceAccount
     name: app-service-account
     namespace: devsecops-app
   roleRef:
     kind: Role
     name: app-role
     apiGroup: rbac.authorization.k8s.io
   ```

4. **Use Service Account**
   ```yaml
   # deployment-with-sa.yaml
   apiVersion: apps/v1
   kind: Deployment
   metadata:
     name: app
   spec:
     template:
       spec:
         serviceAccountName: app-service-account
         containers:
         - name: app
           image: your-app:latest
   ```

#### 🎯 Learning Checkpoint:
- [ ] Service accounts created
- [ ] RBAC roles configured
- [ ] Role bindings working
- [ ] Understand least privilege

### Exercise 6.2: Network Policies
**Difficulty**: ⭐⭐⭐⭐  
**Time**: 90 minutes  
**Cost**: $0

#### Steps:
1. **Install Network Policy Controller**
   ```bash
   # EKS comes with Calico CNI
   # Verify network policies are supported
   kubectl get pods -n kube-system | grep calico
   ```

2. **Create Network Policy**
   ```yaml
   # network-policy.yaml
   apiVersion: networking.k8s.io/v1
   kind: NetworkPolicy
   metadata:
     name: app-network-policy
     namespace: devsecops-app
   spec:
     podSelector:
       matchLabels:
         app: web-app
     policyTypes:
     - Ingress
     - Egress
     ingress:
     - from:
       - namespaceSelector:
           matchLabels:
             name: ingress-nginx
       ports:
       - protocol: TCP
         port: 80
     egress:
     - to:
       - namespaceSelector:
           matchLabels:
             name: database
       ports:
       - protocol: TCP
         port: 5432
     - to: []
       ports:
       - protocol: TCP
         port: 53
       - protocol: UDP
         port: 53
   ```

3. **Test Network Policies**
   ```bash
   # Test connectivity
   kubectl run test-pod --image=busybox --rm -it --restart=Never -- nslookup kubernetes.default
   
   # Test pod-to-pod communication
   kubectl exec -it web-app-pod -- curl database-service:5432
   ```

#### 🎯 Learning Checkpoint:
- [ ] Network policies configured
- [ ] Pod communication controlled
- [ ] Security policies enforced
- [ ] Can test network isolation

## 🔄 Module 7: CI/CD Integration

### Exercise 7.1: GitLab CI with Kubernetes
**Difficulty**: ⭐⭐⭐⭐  
**Time**: 120 minutes  
**Cost**: $0-5

#### Steps:
1. **Create GitLab CI Pipeline**
   ```yaml
   # .gitlab-ci.yml
   stages:
     - build
     - test
     - deploy
   
   variables:
     DOCKER_DRIVER: overlay2
     DOCKER_TLS_CERTDIR: "/certs"
   
   build:
     stage: build
     image: docker:latest
     services:
       - docker:dind
     script:
       - docker build -t $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA .
       - docker push $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA
       - docker tag $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA $CI_REGISTRY_IMAGE:latest
       - docker push $CI_REGISTRY_IMAGE:latest
   
   test:
     stage: test
     image: alpine:latest
     script:
       - echo "Running tests..."
       - echo "Tests passed!"
   
   deploy:
     stage: deploy
     image: alpine/helm:latest
     script:
       - helm repo add stable https://charts.helm.sh/stable
       - helm repo update
       - helm upgrade --install my-app ./helm-chart \
           --set image.tag=$CI_COMMIT_SHA \
           --namespace production \
           --create-namespace
     only:
       - main
   ```

2. **Kubernetes Deployment**
   ```yaml
   # k8s-deployment.yaml
   apiVersion: apps/v1
   kind: Deployment
   metadata:
     name: my-app
   spec:
     replicas: 3
     selector:
       matchLabels:
         app: my-app
     template:
       metadata:
         labels:
           app: my-app
       spec:
         containers:
         - name: my-app
           image: $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA
           ports:
           - containerPort: 8080
   ```

3. **Configure GitLab Kubernetes Integration**
   ```bash
   # Add Kubernetes cluster to GitLab
   # Go to GitLab > Settings > Kubernetes
   # Add cluster with EKS details
   ```

#### 🎯 Learning Checkpoint:
- [ ] GitLab CI pipeline working
- [ ] Docker images built and pushed
- [ ] Kubernetes deployment automated
- [ ] Can deploy from GitLab

### Exercise 7.2: ArgoCD for GitOps
**Difficulty**: ⭐⭐⭐⭐⭐  
**Time**: 150 minutes  
**Cost**: $0-5

#### Steps:
1. **Install ArgoCD**
   ```bash
   # Install ArgoCD
   kubectl create namespace argocd
   kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
   
   # Get admin password
   kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d
   
   # Port forward to access UI
   kubectl port-forward svc/argocd-server -n argocd 8080:443
   ```

2. **Create Application**
   ```yaml
   # application.yaml
   apiVersion: argoproj.io/v1alpha1
   kind: Application
   metadata:
     name: devsecops-app
     namespace: argocd
   spec:
     project: default
     source:
       repoURL: https://github.com/your-username/your-repo.git
       targetRevision: HEAD
       path: k8s
     destination:
       server: https://kubernetes.default.svc
       namespace: production
     syncPolicy:
       automated:
         prune: true
         selfHeal: true
       syncOptions:
       - CreateNamespace=true
   ```

3. **GitOps Workflow**
   ```bash
   # Make changes to Kubernetes manifests
   git add .
   git commit -m "Update application version"
   git push origin main
   
   # ArgoCD automatically syncs changes
   ```

#### 🎯 Learning Checkpoint:
- [ ] ArgoCD installed and configured
- [ ] GitOps workflow working
- [ ] Automatic sync enabled
- [ ] Can manage applications via Git

## 🎯 Final Project: Production-Ready EKS Cluster

### Project Overview
Create a production-ready EKS cluster with:
- **Multi-zone deployment**
- **Auto-scaling capabilities**
- **Monitoring and logging**
- **Security policies**
- **CI/CD pipeline**
- **Disaster recovery**

### Requirements
1. **Infrastructure Setup**
   - EKS cluster across multiple AZs
   - Auto-scaling node groups
   - Load balancer controller
   - Storage classes

2. **Application Deployment**
   - Multi-tier application
   - Database with persistence
   - Ingress and SSL termination
   - Health checks and probes

3. **Monitoring and Security**
   - Prometheus and Grafana
   - ELK stack for logging
   - Network policies
   - RBAC configuration

4. **CI/CD Pipeline**
   - GitLab CI or ArgoCD
   - Automated testing
   - Blue-green deployments
   - Rollback capabilities

### Deliverables
- [ ] Complete EKS cluster configuration
- [ ] Application deployment manifests
- [ ] Monitoring and logging setup
- [ ] Security policies
- [ ] CI/CD pipeline
- [ ] Documentation and runbooks

## 🏆 Silver Level Completion

### Requirements for Silver Badge:
- [ ] Complete all exercises in Modules 1-7
- [ ] Deploy production-ready EKS cluster
- [ ] Implement monitoring and logging
- [ ] Configure security policies
- [ ] Set up CI/CD pipeline
- [ ] Achieve 85% on knowledge assessment

### Next Steps:
- Move to **Gold Level**: CI/CD Pipelines
- Continue with **Security Integration**
- Start **Enterprise Architecture** module

## 📚 Additional Resources

### Official Documentation:
- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [AWS EKS Documentation](https://docs.aws.amazon.com/eks/)
- [Helm Documentation](https://helm.sh/docs/)

### Learning Resources:
- [Kubernetes.io Tutorials](https://kubernetes.io/docs/tutorials/)
- [EKS Workshop](https://www.eksworkshop.com/)
- [Helm Charts](https://helm.sh/docs/chart_template_guide/)

### Certifications:
- Certified Kubernetes Administrator (CKA) ($375)
- Certified Kubernetes Application Developer (CKAD) ($375)
- AWS Certified Kubernetes - Specialty ($300)

### Practice Platforms:
- [Kubernetes Playground](https://www.katacoda.com/courses/kubernetes)
- [EKS Workshop](https://www.eksworkshop.com/)
- [Minikube](https://minikube.sigs.k8s.io/)

---

**🎉 Congratulations! You've completed the Kubernetes Clusters module! 🎉**

*Ready to move to the next level? Let's tackle advanced CI/CD and security integration!* 