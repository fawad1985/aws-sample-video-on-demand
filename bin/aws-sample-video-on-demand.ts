#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { SampleVideoOnDemandStack } from '../lib/sample-video-on-demand-stack';

const app = new cdk.App();
new SampleVideoOnDemandStack(app, 'sample-video-on-demand-dev', {
  env: {
    account: 'XXXXXXXXXXXX',
    region: 'eu-west-1',
  },
  stage: 'dev',
  prefix: 'sample',
  randomString: 'g9xg86'
})