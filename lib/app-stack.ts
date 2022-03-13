import { aws_secretsmanager, CfnOutput, Duration, Stack, StackProps } from 'aws-cdk-lib';
import { Peer, Port, SecurityGroup, Subnet, SubnetType, Vpc } from 'aws-cdk-lib/aws-ec2';
import { AwsLogDriver, Cluster, ContainerImage, FargateTaskDefinition, Protocol, TaskDefinition } from 'aws-cdk-lib/aws-ecs';
import { ApplicationLoadBalancedFargateService } from 'aws-cdk-lib/aws-ecs-patterns';
import { AccountRootPrincipal, Effect, PolicyStatement, Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { CfnDBCluster, CfnDBSubnetGroup, Credentials, DatabaseCluster, DatabaseClusterEngine, ServerlessCluster, SubnetGroup } from 'aws-cdk-lib/aws-rds';
import { Secret } from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';
import ssm = require('@aws-cdk/aws-ssm');

// import * as sqs from 'aws-cdk-lib/aws-sqs';

export class AppStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);
    
    const databaseUsername ='newmotion'
    const databaseName = "testdb"
    const vpc = new Vpc(this, 'MyVPC', { 
      cidr: '10.0.0.0/16',
      subnetConfiguration: [ 
        { name: 'elb_public_', subnetType: SubnetType.PUBLIC },
        { name: 'ecs_private_', subnetType: SubnetType.PRIVATE },
        { name: 'aurora_isolated_', subnetType: SubnetType.ISOLATED }
      ]
    });
    const subnetIds: string[] = [];
    vpc.isolatedSubnets.forEach((subnet, index) => {
      subnetIds.push(subnet.subnetId);
    });

    const dbSubnetGroup: CfnDBSubnetGroup = new CfnDBSubnetGroup(this, 'AuroraSubnetGroup', {
      dbSubnetGroupDescription: 'Subnet group to access aurora',
      dbSubnetGroupName: 'aurora-serverless-subnet-group',
      subnetIds
    });

    const databaseCredentialsSecret = new aws_secretsmanager.Secret(this, 'DBCredentialsSecret', {
      secretName: `aurora-credentials`,
      generateSecretString: {
        secretStringTemplate: JSON.stringify({
          username: databaseUsername,
        }),
        excludePunctuation: true,
        includeSpace: false,
        generateStringKey: 'password'
      }
    });


    const dbClusterSecurityGroup = new SecurityGroup(this, 'DBClusterSecurityGroup', { vpc });

    dbClusterSecurityGroup.addIngressRule(Peer.ipv4('10.0.0.0/16'), Port.tcp(5432));

    const dbConfig = {
      dbClusterIdentifier: `aurora-cluster`,
      engineMode: 'serverless',
      engine: 'aurora-postgresql',
      engineVersion: '10.7',
      databaseName: databaseName,
      masterUsername: databaseCredentialsSecret.secretValueFromJson('username').toString(),
      masterUserPassword: databaseCredentialsSecret.secretValueFromJson('password').toString(),
      dbSubnetGroupName: dbSubnetGroup.dbSubnetGroupName,
      scalingConfiguration: {
        autoPause: true,
        maxCapacity: 2,
        minCapacity: 2,
        secondsUntilAutoPause: 3600,
      },
      vpcSecurityGroupIds: [
        dbClusterSecurityGroup.securityGroupId
      ]
    };

    const rdsCluster = new CfnDBCluster(this, 'DBCluster', dbConfig);
    rdsCluster.addDependsOn(dbSubnetGroup)

    const cluster = new Cluster(this, 'Cluster', { vpc });
    const loadBalancedService = new ApplicationLoadBalancedFargateService(this, "FargateService", {
      cluster,
      
      taskImageOptions: {
        image: ContainerImage.fromRegistry("steblyuk/epoch:testwpwd"),
        containerPort:8000,
        environment: {
          AWS_RDS_HOST: rdsCluster.attrEndpointAddress,
          AWS_RDS_DB: databaseName,
          // TODO: use secret instead of environment
          AWS_RDS_USER: databaseCredentialsSecret.secretValueFromJson('username').toString(),
          AWS_RDS_PWD: databaseCredentialsSecret.secretValueFromJson('password').toString(),
        }
      },
    });
    loadBalancedService.targetGroup.configureHealthCheck({
      port: "8000",
      // enabled:false,
    })
    
    const scaling = loadBalancedService.service.autoScaleTaskCount({ maxCapacity: 6, minCapacity:2});
    scaling.scaleOnCpuUtilization('CpuScaling', {
      targetUtilizationPercent: 50,
      scaleInCooldown: Duration.seconds(60),
      scaleOutCooldown: Duration.seconds(60)
    });
    new CfnOutput(this, 'LoadBalancerDNS', { value: loadBalancedService.loadBalancer.loadBalancerDnsName });
  }
}
