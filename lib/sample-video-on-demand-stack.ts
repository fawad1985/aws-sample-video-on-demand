import { Aws, Duration, RemovalPolicy, Stack, StackProps, CfnOutput} from 'aws-cdk-lib'
import { Construct } from 'constructs'
import * as s3 from 'aws-cdk-lib/aws-s3'
import * as sns from 'aws-cdk-lib/aws-sns'
import * as subs from 'aws-cdk-lib/aws-sns-subscriptions'
import * as s3n from 'aws-cdk-lib/aws-s3-notifications'
import * as lambda from 'aws-cdk-lib/aws-lambda'
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront'
import * as mediaconvert from 'aws-cdk-lib/aws-mediaconvert'
import * as events from 'aws-cdk-lib/aws-events'
import * as targets from "aws-cdk-lib/aws-events-targets"
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs"
import { LogGroup, RetentionDays } from 'aws-cdk-lib/aws-logs'
import { Effect, PolicyStatement, Role, ServicePrincipal, CfnRole, CanonicalUserPrincipal} from 'aws-cdk-lib/aws-iam'
import { RestApi, LambdaIntegration, DomainName, Cors, AuthorizationType} from 'aws-cdk-lib/aws-apigateway'
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb'
import * as path from 'path'

interface SampleVideoOnDemandStackProps extends StackProps {
  stage: string
  prefix: string
  randomString: string
}

export class SampleVideoOnDemandStack extends Stack {
  // public readonly inputBucketName
  constructor(scope: Construct, id: string, props: SampleVideoOnDemandStackProps) {

    super(scope, id, props);

    /**
     * S3 Input Bucket
     * This bucket acts as input to AWS Elemental Media Convert
     */
    const inputBucket = new s3.Bucket(this, `${props.prefix}-transcode-input-${props.stage}-${props.randomString}`, {
      bucketName: `${props.prefix}-transcode-input-${props.stage}-${props.randomString}`,
      cors: [{
        allowedMethods: [s3.HttpMethods.GET, s3.HttpMethods.HEAD, s3.HttpMethods.POST, s3.HttpMethods.PUT, s3.HttpMethods.DELETE],
        allowedOrigins: ["*"],
        allowedHeaders: ["*"],
        exposedHeaders: ["x-amz-server-side-encryption", "x-amz-request-id", "x-amz-id-2", "ETag"]
      }],
      publicReadAccess: false,
      removalPolicy: RemovalPolicy.DESTROY,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL
    })

    
    new CfnOutput(this, `${inputBucket}`, {
      description: "S3 bucket that acts as input to AWS Elemental Media Convert.",
      value: `${inputBucket}`,      
    })

    /**
     * SNS Topic 
     * This topic gets triggered whenever there is a new file in input S3 bucket
     */
    const snsTopic = new sns.Topic(this, `${props.prefix}-transcode-topic-${props.stage}`, {
      topicName: `${props.prefix}-transcode-topic-${props.stage}`,
      displayName: `${props.prefix}-transcode-topic-${props.stage}`,
    })

    /**
     * Add Bucket Notification
     */
    inputBucket.addEventNotification(s3.EventType.OBJECT_CREATED, new s3n.SnsDestination(snsTopic), { suffix: '.mp4' })
    inputBucket.addEventNotification(s3.EventType.OBJECT_CREATED, new s3n.SnsDestination(snsTopic), { suffix: '.h264' })


    /**
     * S3 Output Bucket
     * Bucket where AWS Elemental Media Convert writes encoded output and create a playlist
     */
    const outputBucket = new s3.Bucket(this, `${props.prefix}-transcode-output-${props.stage}-${props.randomString}`, {
      bucketName: `${props.prefix}-transcode-output-${props.stage}-${props.randomString}`,
      cors: [{
        allowedMethods: [s3.HttpMethods.GET, s3.HttpMethods.HEAD, s3.HttpMethods.POST, s3.HttpMethods.PUT, s3.HttpMethods.DELETE],
        allowedOrigins: ["*"],
        allowedHeaders: ["*"],
        exposedHeaders: ["x-amz-server-side-encryption", "x-amz-request-id", "x-amz-id-2", "ETag"]
      }],
      publicReadAccess: false,
      removalPolicy: RemovalPolicy.DESTROY,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL
    })

    
    new CfnOutput(this, `${outputBucket}`, {
      description: "S3 bucket that acts as output for AWS Elemental Media Convert.",
      value: `${outputBucket}`,      
    })

    /**
     * Restrict access to an Amazon S3 origin
     * CloudFront provides two ways to send authenticated requests to an Amazon S3 origin: origin access control (OAC) and origin access identity (OAI)
     */
    const originAccessIdentity = new cloudfront.CfnCloudFrontOriginAccessIdentity(this, `${props.prefix}-origin-access-identity-${props.stage}`, {
      cloudFrontOriginAccessIdentityConfig: {
        comment: 'access-identity-sample-transcode-output-dev',
      },
    })

    outputBucket.addToResourcePolicy(
      new PolicyStatement({
        resources: [
          `${outputBucket.bucketArn}/*`
        ],
        actions: [
          's3:GetObject',
          's3:GetObjectVersion',
          's3:GetObjectTorrent'
        ],
        principals: [new CanonicalUserPrincipal(originAccessIdentity.attrS3CanonicalUserId)]
      })
    );

    
    /**
     * Sample Media Convert Job Template
     */
    const jobTemplate = new mediaconvert.CfnJobTemplate(this, `${props.prefix}-transcode-template-${props.stage}`, {
      name: `${props.prefix}-transcode-template-${props.stage}`,
      description: 'NLA Optimized Encoding Template for Si2 videos. Both instant+continuous, 30fps (Apple HLS)',
      category: 'OTT-HLS',
      accelerationSettings: {
        mode: 'DISABLED',
      },
      settingsJson: {
        OutputGroups: [
          {
            Name: 'Apple HLS',
            Outputs: [
              {
                ContainerSettings: {
                  Container: 'M3U8',
                  M3u8Settings: {
                    AudioFramesPerPes: 4,
                    PcrControl: 'PCR_EVERY_PES_PACKET',
                    PmtPid: 480,
                    PrivateMetadataPid: 503,
                    ProgramNumber: 1,
                    PatInterval: 0,
                    PmtInterval: 0,
                    VideoPid: 481,
                    AudioPids: [
                      482,
                      483,
                      484,
                      485,
                      486,
                      487,
                      488,
                      489,
                      490,
                      491,
                      492,
                      493,
                      494,
                      495,
                      496,
                      497,
                      498,
                    ],
                  },
                },
                VideoDescription: {
                  Width: 266,
                  ScalingBehavior: 'STRETCH_TO_OUTPUT',
                  Height: 200,
                  VideoPreprocessors: {
                    Deinterlacer: {
                      Algorithm: 'INTERPOLATE',
                      Mode: 'DEINTERLACE',
                      Control: 'NORMAL',
                    },
                  },
                  TimecodeInsertion: 'DISABLED',
                  AntiAlias: 'ENABLED',
                  Sharpness: 100,
                  CodecSettings: {
                    Codec: 'H_264',
                    H264Settings: {
                      InterlaceMode: 'PROGRESSIVE',
                      ParNumerator: 1,
                      NumberReferenceFrames: 3,
                      Syntax: 'DEFAULT',
                      FramerateDenominator: 1,
                      GopClosedCadence: 1,
                      HrdBufferInitialFillPercentage: 90,
                      GopSize: 3,
                      Slices: 1,
                      GopBReference: 'ENABLED',
                      HrdBufferSize: 1000000,
                      MaxBitrate: 400000,
                      SlowPal: 'DISABLED',
                      ParDenominator: 1,
                      SpatialAdaptiveQuantization: 'ENABLED',
                      TemporalAdaptiveQuantization: 'ENABLED',
                      FlickerAdaptiveQuantization: 'ENABLED',
                      EntropyEncoding: 'CABAC',
                      FramerateControl: 'SPECIFIED',
                      RateControlMode: 'QVBR',
                      QvbrSettings: {
                        QvbrQualityLevel: 7,
                      },
                      CodecProfile: 'HIGH',
                      Telecine: 'NONE',
                      FramerateNumerator: 30,
                      MinIInterval: 0,
                      AdaptiveQuantization: 'MEDIUM',
                      CodecLevel: 'LEVEL_3_1',
                      FieldEncoding: 'PAFF',
                      SceneChangeDetect: 'ENABLED',
                      QualityTuningLevel: 'SINGLE_PASS_HQ',
                      FramerateConversionAlgorithm: 'DUPLICATE_DROP',
                      UnregisteredSeiTimecode: 'DISABLED',
                      GopSizeUnits: 'SECONDS',
                      ParControl: 'SPECIFIED',
                      NumberBFramesBetweenReferenceFrames: 5,
                      RepeatPps: 'DISABLED',
                      DynamicSubGop: 'ADAPTIVE',
                    },
                  },
                  AfdSignaling: 'NONE',
                  DropFrameTimecode: 'ENABLED',
                  RespondToAfd: 'NONE',
                  ColorMetadata: 'INSERT',
                },
                AudioDescriptions: [
                  {
                    AudioTypeControl: 'FOLLOW_INPUT',
                    AudioSourceName: 'Audio Selector 1',
                    CodecSettings: {
                      Codec: 'AAC',
                      AacSettings: {
                        AudioDescriptionBroadcasterMix: 'NORMAL',
                        Bitrate: 64000,
                        RateControlMode: 'CBR',
                        CodecProfile: 'HEV1',
                        CodingMode: 'CODING_MODE_2_0',
                        RawFormat: 'NONE',
                        SampleRate: 48000,
                        Specification: 'MPEG4',
                      },
                    },
                    LanguageCodeControl: 'FOLLOW_INPUT',
                    AudioType: 0,
                  },
                ],
                NameModifier: '_266x200_0.4Mbps',
              },
              {
                ContainerSettings: {
                  Container: 'M3U8',
                  M3u8Settings: {
                    AudioFramesPerPes: 4,
                    PcrControl: 'PCR_EVERY_PES_PACKET',
                    PmtPid: 480,
                    PrivateMetadataPid: 503,
                    ProgramNumber: 1,
                    PatInterval: 0,
                    PmtInterval: 0,
                    VideoPid: 481,
                    AudioPids: [
                      482,
                      483,
                      484,
                      485,
                      486,
                      487,
                      488,
                      489,
                      490,
                      491,
                      492,
                      493,
                      494,
                      495,
                      496,
                      497,
                      498,
                    ],
                  },
                },
                VideoDescription: {
                  Width: 532,
                  ScalingBehavior: 'STRETCH_TO_OUTPUT',
                  Height: 400,
                  VideoPreprocessors: {
                    Deinterlacer: {
                      Algorithm: 'INTERPOLATE',
                      Mode: 'DEINTERLACE',
                      Control: 'NORMAL',
                    },
                  },
                  TimecodeInsertion: 'DISABLED',
                  AntiAlias: 'ENABLED',
                  Sharpness: 100,
                  CodecSettings: {
                    Codec: 'H_264',
                    H264Settings: {
                      InterlaceMode: 'PROGRESSIVE',
                      ParNumerator: 1,
                      NumberReferenceFrames: 3,
                      Syntax: 'DEFAULT',
                      FramerateDenominator: 1,
                      GopClosedCadence: 1,
                      HrdBufferInitialFillPercentage: 90,
                      GopSize: 3,
                      Slices: 1,
                      GopBReference: 'ENABLED',
                      HrdBufferSize: 2500000,
                      MaxBitrate: 1000000,
                      SlowPal: 'DISABLED',
                      ParDenominator: 1,
                      SpatialAdaptiveQuantization: 'ENABLED',
                      TemporalAdaptiveQuantization: 'ENABLED',
                      FlickerAdaptiveQuantization: 'ENABLED',
                      EntropyEncoding: 'CABAC',
                      FramerateControl: 'SPECIFIED',
                      RateControlMode: 'QVBR',
                      QvbrSettings: {
                        QvbrQualityLevel: 7,
                      },
                      CodecProfile: 'HIGH',
                      Telecine: 'NONE',
                      FramerateNumerator: 30,
                      MinIInterval: 0,
                      AdaptiveQuantization: 'MEDIUM',
                      CodecLevel: 'LEVEL_3_1',
                      FieldEncoding: 'PAFF',
                      SceneChangeDetect: 'ENABLED',
                      QualityTuningLevel: 'SINGLE_PASS_HQ',
                      FramerateConversionAlgorithm: 'DUPLICATE_DROP',
                      UnregisteredSeiTimecode: 'DISABLED',
                      GopSizeUnits: 'SECONDS',
                      ParControl: 'SPECIFIED',
                      NumberBFramesBetweenReferenceFrames: 5,
                      RepeatPps: 'DISABLED',
                      DynamicSubGop: 'ADAPTIVE',
                    },
                  },
                  AfdSignaling: 'NONE',
                  DropFrameTimecode: 'ENABLED',
                  RespondToAfd: 'NONE',
                  ColorMetadata: 'INSERT',
                },
                AudioDescriptions: [
                  {
                    AudioTypeControl: 'FOLLOW_INPUT',
                    AudioSourceName: 'Audio Selector 1',
                    CodecSettings: {
                      Codec: 'AAC',
                      AacSettings: {
                        AudioDescriptionBroadcasterMix: 'NORMAL',
                        Bitrate: 64000,
                        RateControlMode: 'CBR',
                        CodecProfile: 'HEV1',
                        CodingMode: 'CODING_MODE_2_0',
                        RawFormat: 'NONE',
                        SampleRate: 48000,
                        Specification: 'MPEG4',
                      },
                    },
                    LanguageCodeControl: 'FOLLOW_INPUT',
                    AudioType: 0,
                  },
                ],
                NameModifier: '_532x400_1.0Mbps',
              },
              {
                ContainerSettings: {
                  Container: 'M3U8',
                  M3u8Settings: {
                    AudioFramesPerPes: 4,
                    PcrControl: 'PCR_EVERY_PES_PACKET',
                    PmtPid: 480,
                    PrivateMetadataPid: 503,
                    ProgramNumber: 1,
                    PatInterval: 0,
                    PmtInterval: 0,
                    VideoPid: 481,
                    AudioPids: [
                      482,
                      483,
                      484,
                      485,
                      486,
                      487,
                      488,
                      489,
                      490,
                      491,
                      492,
                      493,
                      494,
                      495,
                      496,
                      497,
                      498,
                    ],
                  },
                },
                VideoDescription: {
                  Width: 1064,
                  ScalingBehavior: 'STRETCH_TO_OUTPUT',
                  Height: 800,
                  VideoPreprocessors: {
                    Deinterlacer: {
                      Algorithm: 'INTERPOLATE',
                      Mode: 'DEINTERLACE',
                      Control: 'NORMAL',
                    },
                  },
                  TimecodeInsertion: 'DISABLED',
                  AntiAlias: 'ENABLED',
                  Sharpness: 100,
                  CodecSettings: {
                    Codec: 'H_264',
                    H264Settings: {
                      InterlaceMode: 'PROGRESSIVE',
                      ParNumerator: 1,
                      NumberReferenceFrames: 3,
                      Syntax: 'DEFAULT',
                      FramerateDenominator: 1,
                      GopClosedCadence: 1,
                      HrdBufferInitialFillPercentage: 90,
                      GopSize: 3,
                      Slices: 1,
                      GopBReference: 'ENABLED',
                      HrdBufferSize: 5000000,
                      MaxBitrate: 2000000,
                      SlowPal: 'DISABLED',
                      ParDenominator: 1,
                      SpatialAdaptiveQuantization: 'ENABLED',
                      TemporalAdaptiveQuantization: 'ENABLED',
                      FlickerAdaptiveQuantization: 'ENABLED',
                      EntropyEncoding: 'CABAC',
                      FramerateControl: 'SPECIFIED',
                      RateControlMode: 'QVBR',
                      QvbrSettings: {
                        QvbrQualityLevel: 8,
                      },
                      CodecProfile: 'HIGH',
                      Telecine: 'NONE',
                      FramerateNumerator: 30,
                      MinIInterval: 0,
                      AdaptiveQuantization: 'HIGH',
                      CodecLevel: 'LEVEL_4',
                      FieldEncoding: 'PAFF',
                      SceneChangeDetect: 'ENABLED',
                      QualityTuningLevel: 'SINGLE_PASS_HQ',
                      FramerateConversionAlgorithm: 'DUPLICATE_DROP',
                      UnregisteredSeiTimecode: 'DISABLED',
                      GopSizeUnits: 'SECONDS',
                      ParControl: 'SPECIFIED',
                      NumberBFramesBetweenReferenceFrames: 5,
                      RepeatPps: 'DISABLED',
                      DynamicSubGop: 'ADAPTIVE',
                    },
                  },
                  AfdSignaling: 'NONE',
                  DropFrameTimecode: 'ENABLED',
                  RespondToAfd: 'NONE',
                  ColorMetadata: 'INSERT',
                },
                AudioDescriptions: [
                  {
                    AudioTypeControl: 'FOLLOW_INPUT',
                    AudioSourceName: 'Audio Selector 1',
                    CodecSettings: {
                      Codec: 'AAC',
                      AacSettings: {
                        AudioDescriptionBroadcasterMix: 'NORMAL',
                        Bitrate: 96000,
                        RateControlMode: 'CBR',
                        CodecProfile: 'HEV1',
                        CodingMode: 'CODING_MODE_2_0',
                        RawFormat: 'NONE',
                        SampleRate: 48000,
                        Specification: 'MPEG4',
                      },
                    },
                    LanguageCodeControl: 'FOLLOW_INPUT',
                    AudioType: 0,
                  },
                ],
                NameModifier: '_1064x800_2.0Mbps',
              },
              {
                ContainerSettings: {
                  Container: 'M3U8',
                  M3u8Settings: {
                    AudioFramesPerPes: 4,
                    PcrControl: 'PCR_EVERY_PES_PACKET',
                    PmtPid: 480,
                    PrivateMetadataPid: 503,
                    ProgramNumber: 1,
                    PatInterval: 0,
                    PmtInterval: 0,
                    VideoPid: 481,
                    AudioPids: [
                      482,
                      483,
                      484,
                      485,
                      486,
                      487,
                      488,
                      489,
                      490,
                      491,
                      492,
                      493,
                      494,
                      495,
                      496,
                      497,
                      498,
                    ],
                  },
                },
                VideoDescription: {
                  Width: 1640,
                  ScalingBehavior: 'STRETCH_TO_OUTPUT',
                  Height: 1232,
                  VideoPreprocessors: {
                    Deinterlacer: {
                      Algorithm: 'INTERPOLATE',
                      Mode: 'DEINTERLACE',
                      Control: 'NORMAL',
                    },
                  },
                  TimecodeInsertion: 'DISABLED',
                  AntiAlias: 'ENABLED',
                  Sharpness: 100,
                  CodecSettings: {
                    Codec: 'H_264',
                    H264Settings: {
                      InterlaceMode: 'PROGRESSIVE',
                      ParNumerator: 1,
                      NumberReferenceFrames: 3,
                      Syntax: 'DEFAULT',
                      FramerateDenominator: 1,
                      GopClosedCadence: 1,
                      HrdBufferInitialFillPercentage: 90,
                      GopSize: 3,
                      Slices: 1,
                      GopBReference: 'ENABLED',
                      HrdBufferSize: 10000000,
                      MaxBitrate: 4000000,
                      SlowPal: 'DISABLED',
                      ParDenominator: 1,
                      SpatialAdaptiveQuantization: 'ENABLED',
                      TemporalAdaptiveQuantization: 'ENABLED',
                      FlickerAdaptiveQuantization: 'ENABLED',
                      EntropyEncoding: 'CABAC',
                      FramerateControl: 'SPECIFIED',
                      RateControlMode: 'QVBR',
                      QvbrSettings: {
                        QvbrQualityLevel: 8,
                      },
                      CodecProfile: 'HIGH',
                      Telecine: 'NONE',
                      FramerateNumerator: 30,
                      MinIInterval: 0,
                      AdaptiveQuantization: 'HIGH',
                      CodecLevel: 'LEVEL_4',
                      FieldEncoding: 'PAFF',
                      SceneChangeDetect: 'ENABLED',
                      QualityTuningLevel: 'SINGLE_PASS_HQ',
                      FramerateConversionAlgorithm: 'DUPLICATE_DROP',
                      UnregisteredSeiTimecode: 'DISABLED',
                      GopSizeUnits: 'SECONDS',
                      ParControl: 'SPECIFIED',
                      NumberBFramesBetweenReferenceFrames: 5,
                      RepeatPps: 'DISABLED',
                      DynamicSubGop: 'ADAPTIVE',
                    },
                  },
                  AfdSignaling: 'NONE',
                  DropFrameTimecode: 'ENABLED',
                  RespondToAfd: 'NONE',
                  ColorMetadata: 'INSERT',
                },
                AudioDescriptions: [
                  {
                    AudioTypeControl: 'FOLLOW_INPUT',
                    AudioSourceName: 'Audio Selector 1',
                    CodecSettings: {
                      Codec: 'AAC',
                      AacSettings: {
                        AudioDescriptionBroadcasterMix: 'NORMAL',
                        Bitrate: 96000,
                        RateControlMode: 'CBR',
                        CodecProfile: 'HEV1',
                        CodingMode: 'CODING_MODE_2_0',
                        RawFormat: 'NONE',
                        SampleRate: 48000,
                        Specification: 'MPEG4',
                      },
                    },
                    LanguageCodeControl: 'FOLLOW_INPUT',
                    AudioType: 0,
                  },
                ],
                NameModifier: '_1640x1232_4.0Mbps',
              },
              {
                ContainerSettings: {
                  Container: 'M3U8',
                  M3u8Settings: {
                    AudioFramesPerPes: 4,
                    PcrControl: 'PCR_EVERY_PES_PACKET',
                    PmtPid: 480,
                    PrivateMetadataPid: 503,
                    ProgramNumber: 1,
                    PatInterval: 0,
                    PmtInterval: 0,
                    VideoPid: 481,
                    AudioPids: [
                      482,
                      483,
                      484,
                      485,
                      486,
                      487,
                      488,
                      489,
                      490,
                      491,
                      492,
                      493,
                      494,
                      495,
                      496,
                      497,
                      498,
                    ],
                  },
                },
                VideoDescription: {
                  Width: 1640,
                  ScalingBehavior: 'STRETCH_TO_OUTPUT',
                  Height: 1232,
                  VideoPreprocessors: {
                    Deinterlacer: {
                      Algorithm: 'INTERPOLATE',
                      Mode: 'DEINTERLACE',
                      Control: 'NORMAL',
                    },
                  },
                  TimecodeInsertion: 'DISABLED',
                  AntiAlias: 'ENABLED',
                  Sharpness: 100,
                  CodecSettings: {
                    Codec: 'H_264',
                    H264Settings: {
                      InterlaceMode: 'PROGRESSIVE',
                      ParNumerator: 1,
                      NumberReferenceFrames: 3,
                      Syntax: 'DEFAULT',
                      FramerateDenominator: 1,
                      GopClosedCadence: 1,
                      HrdBufferInitialFillPercentage: 90,
                      GopSize: 3,
                      Slices: 1,
                      GopBReference: 'ENABLED',
                      HrdBufferSize: 20000000,
                      MaxBitrate: 8000000,
                      SlowPal: 'DISABLED',
                      ParDenominator: 1,
                      SpatialAdaptiveQuantization: 'ENABLED',
                      TemporalAdaptiveQuantization: 'ENABLED',
                      FlickerAdaptiveQuantization: 'ENABLED',
                      EntropyEncoding: 'CABAC',
                      FramerateControl: 'SPECIFIED',
                      RateControlMode: 'QVBR',
                      QvbrSettings: {
                        QvbrQualityLevel: 9,
                      },
                      CodecProfile: 'HIGH',
                      Telecine: 'NONE',
                      FramerateNumerator: 30,
                      MinIInterval: 0,
                      AdaptiveQuantization: 'HIGH',
                      CodecLevel: 'LEVEL_4',
                      FieldEncoding: 'PAFF',
                      SceneChangeDetect: 'ENABLED',
                      QualityTuningLevel: 'SINGLE_PASS_HQ',
                      FramerateConversionAlgorithm: 'DUPLICATE_DROP',
                      UnregisteredSeiTimecode: 'DISABLED',
                      GopSizeUnits: 'SECONDS',
                      ParControl: 'SPECIFIED',
                      NumberBFramesBetweenReferenceFrames: 5,
                      RepeatPps: 'DISABLED',
                      DynamicSubGop: 'ADAPTIVE',
                    },
                  },
                  AfdSignaling: 'NONE',
                  DropFrameTimecode: 'ENABLED',
                  RespondToAfd: 'NONE',
                  ColorMetadata: 'INSERT',
                },
                AudioDescriptions: [
                  {
                    AudioTypeControl: 'FOLLOW_INPUT',
                    AudioSourceName: 'Audio Selector 1',
                    CodecSettings: {
                      Codec: 'AAC',
                      AacSettings: {
                        AudioDescriptionBroadcasterMix: 'NORMAL',
                        Bitrate: 128000,
                        RateControlMode: 'CBR',
                        CodecProfile: 'LC',
                        CodingMode: 'CODING_MODE_2_0',
                        RawFormat: 'NONE',
                        SampleRate: 48000,
                        Specification: 'MPEG4',
                      },
                    },
                    LanguageCodeControl: 'FOLLOW_INPUT',
                    AudioType: 0,
                  },
                ],
                NameModifier: '_1640x1232_8.0Mbps',
              },
            ],
            OutputGroupSettings: {
              Type: 'HLS_GROUP_SETTINGS',
              HlsGroupSettings: {
                ManifestDurationFormat: 'INTEGER',
                SegmentLength: 6,
                TimedMetadataId3Period: 10,
                CaptionLanguageSetting: 'OMIT',
                TimedMetadataId3Frame: 'PRIV',
                CodecSpecification: 'RFC_4281',
                OutputSelection: 'MANIFESTS_AND_SEGMENTS',
                ProgramDateTimePeriod: 600,
                MinSegmentLength: 0,
                DirectoryStructure: 'SINGLE_DIRECTORY',
                ProgramDateTime: 'EXCLUDE',
                SegmentControl: 'SEGMENTED_FILES',
                ManifestCompression: 'NONE',
                ClientCache: 'ENABLED',
                StreamInfResolution: 'INCLUDE',
              },
            },
          },
        ],
        AdAvailOffset: 0,
      },
    });
    new CfnOutput(this, `${props.prefix}-transcode-template-output-${props.stage}`, {
      description: "AWS Elemental Media Convert Sample Job Template.",
      value: `${jobTemplate.attrArn}`,      
    })

    /**
     * Allow AWS Elemental Media Convert to read/write on input/output buckets
     * This Role gets passed by the λ function to the AWS Elemental Media Convert
     */
    const mediaConvertRole = new CfnRole(this, `${props.prefix}-media-convert-role-${props.stage}`, {
      roleName: `${props.prefix}-media-convert-role-${props.stage}`,
      assumeRolePolicyDocument: {
        Version: '2012-10-17',
        Statement: [
          {
            Effect: 'Allow',
            Principal: {
              Service: [
                'mediaconvert.amazonaws.com',
              ],
            },
            Action: [
              'sts:AssumeRole',
            ],
          },
        ],
      },
      policies: [
        {
          policyName: `${props.prefix}-media-convert-policy-${props.stage}`,
          policyDocument: {
            Statement: [
              {
                Effect: 'Allow',
                Action: [
                  's3:GetObject',
                  's3:PutObject',
                ],
                Resource: [
                  `${inputBucket.bucketArn}/*`,
                  `${outputBucket.bucketArn}/*`
                ],
              },
              {
                Effect: 'Allow',
                Action: [
                  'execute-api:Invoke',
                ],
                Resource: [
                  `arn:aws:execute-api:${this.region}:${this.account}:*`
                ],
              },
            ],
          },
        },
      ],
    })

    /**
     * DynamoDB Table
     * A single table that stores all the Encoded jobs and their statuses 
     */
    const jobsTable = new dynamodb.Table(this, `${props.prefix}-jobs-table-${props.stage}`, {
      tableName: `${props.prefix}-jobs-table-${props.stage}`,
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecovery: false,
      deletionProtection:  false,
      removalPolicy:  RemovalPolicy.DESTROY,
      partitionKey: {
        name: 'pk',
        type: dynamodb.AttributeType.STRING
      },
      sortKey: {
        name: 'sk',
        type: dynamodb.AttributeType.STRING
      }
    })
    jobsTable.addLocalSecondaryIndex({
      indexName: 'lsi',
      sortKey: {
        name: 'filename',
        type: dynamodb.AttributeType.STRING
      },
      projectionType: dynamodb.ProjectionType.ALL
    })
    new CfnOutput(this, `${props.prefix}-jobs-table-${props.stage}-output`, {
      description: "DynamoDB jobs table.",
      value: `${jobsTable.tableArn}`,      
    })

    /**
     * CloudFront Public Key
     * Private key needs to be attached on the console manually
     */
    const cloudfrontPublicKey = new cloudfront.PublicKey(this, `${props.prefix}-cloudfront-public-key-${props.stage}`, {
      publicKeyName: `${props.prefix}-cloudfront-public-key-${props.stage}`,
      comment: 'Public key for signed url',
      /**
       * Insert your own public key, you can generate it by executing following commands
       * openssl genrsa -out private_key.pem 2048
       * openssl rsa -pubout -in private_key.pem -out public_key.pem
       */
      encodedKey: '-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAxilSTqIoyfl5EWPQIrir\ndO0Pn+3idH+l4Jaoy5J9UQleqZ7DrtzneatZCfdIL3sOvoA1MZ63O7hGs+eb8xxO\nM4UQ1puP20S0n3xbYqSX5MLmw71+5PR05siRV1bDOu9VoZB1XJB3rvkMyITfl1yY\n1LcVJCoPtltb6eRD9fptHhhzFITCDDbc2sgqDvpkqRDp40GFOGAzcoPbMpxxFtZS\nahZ7NFbx2LpiHbg4Le08sJgRvmVj0rWuDAvhINXBnAPvYohbeFb121uryahka34e\nhfSl+slE683fVEWWMdpdJtkggTx/YoeZsvP7jloAHuN25SQAg/SUE+0bMstfzVCK\n6wIDAQAB\n-----END PUBLIC KEY-----\n',
    })
    
    /**
     * CloudFront Key Group for Signed Url
     */
    const cloudfrontKeyGroup = new cloudfront.KeyGroup(this, `${props.prefix}-cloudfront-key-group-${props.stage}`, {
      keyGroupName: `${props.prefix}-cloudfront-key-group-${props.stage}`,
      comment: 'Key group for signed url',
      items: [cloudfrontPublicKey]
    })
    
    const cloudFrontDistribution = new cloudfront.CfnDistribution(this, `${props.prefix}-cloudfront-distribution-${props.stage}`, {
      distributionConfig: {
        enabled: true,
        priceClass: 'PriceClass_All',
        comment: 'nla-video-transcode-dev video-on-demand',
        origins: [
          {
            domainName: `${outputBucket.bucketName}.s3.${this.region}.amazonaws.com`,
            id: 'vodS3Origin',
            s3OriginConfig: {
              originAccessIdentity: `origin-access-identity/cloudfront/${originAccessIdentity.ref}`,
            },
          },
        ],
        defaultCacheBehavior: {
          allowedMethods: ['GET', 'HEAD', 'OPTIONS'],
          cachedMethods: ['GET', 'HEAD', 'OPTIONS'],
          defaultTtl: 86400,
          minTtl: 86400,
          maxTtl: 7776000,
          forwardedValues: {
            queryString: false,
          },
          targetOriginId: 'vodS3Origin',
          viewerProtocolPolicy: 'redirect-to-https',
          compress: true,
          trustedKeyGroups: [
            cloudfrontKeyGroup.keyGroupId
          ],
        },
      },
    })

    new CfnOutput(this, `${props.prefix}-cloudfront-dist-output-${props.stage}`, {
      description: "CloudFront distribution.",
      value: `https://${cloudFrontDistribution.attrDomainName}`,      
    })
    /**
     * Common λ Function
     * This λ Function gets triggered everytime we have a message on SNS topic
     * This λ Function gets triggered everytime we have a message from Eventbridge 
     * This λ Function gets triggered on Http Api Endpoints
     */
    new LogGroup(this, `${props.prefix}-transcode-req-log-grp-${props.stage}`, {
      logGroupName: `/aws/lambda/${props.prefix}-transcode-request-${props.stage}`,
      retention: RetentionDays.ONE_YEAR,
      removalPolicy: RemovalPolicy.DESTROY,
    })
    const transcodeRequestLambdaFn = new NodejsFunction(this, `${props.prefix}-transcode-request-${props.stage}`, {
      functionName: `${props.prefix}-transcode-request-${props.stage}`,
      runtime: lambda.Runtime.NODEJS_18_X,
      timeout: Duration.seconds(29),
      memorySize: 512,
      handler: 'handler',
      environment: {
        STAGE: props.stage,
        CLOUDFRONT_DOMAIN: cloudFrontDistribution.attrDomainName,
        CLOUDFRONT_KEY_ID: cloudfrontPublicKey.publicKeyId,
        JOB_TEMPLATE_ARN: jobTemplate.attrArn,
        JOBS_TABLE_NAME: jobsTable.tableName,
        MEDIA_CONVERT_ROLE_ARN: mediaConvertRole.attrArn,
        OUTPUT_BUCKET_NAME: outputBucket.bucketName
      },
      entry: path.join(__dirname, '/../functions/request.ts'),
    })
    transcodeRequestLambdaFn.addToRolePolicy(new PolicyStatement({
      actions: [
        'mediaconvert:CreateJob',
        'mediaconvert:CreateJobTemplate',
        'mediaconvert:CreatePreset',
        'mediaconvert:DeleteJobTemplate',
        'mediaconvert:DeletePreset',
        'mediaconvert:DescribeEndpoints',
        'mediaconvert:GetJob',
        'mediaconvert:GetJobTemplate',
        'mediaconvert:GetQueue',
        'mediaconvert:GetPreset',
        'mediaconvert:ListJobTemplates',
        'mediaconvert:ListJobs',
        'mediaconvert:ListQueues',
        'mediaconvert:ListPresets',
        'mediaconvert:UpdateJobTemplate'
      ],
      resources: [`arn:aws:mediaconvert:${this.region}:${this.account}:*`]
    }))
    transcodeRequestLambdaFn.addToRolePolicy(new PolicyStatement({
      actions: [
        'iam:PassRole'
      ],
      resources: [mediaConvertRole.attrArn]
    }))
    transcodeRequestLambdaFn.addToRolePolicy(new PolicyStatement({
      actions: [
        's3:GetObject',
        's3:PutObject',
        's3:ListObjectsV2',
        's3:HeadObject',
      ],
      resources: [
        `${inputBucket.bucketArn}/*`
      ]
    }))
    transcodeRequestLambdaFn.addToRolePolicy(new PolicyStatement({
      actions: [
        's3:ListBucket'
      ],
      resources: [
        inputBucket.bucketArn
      ]
    }))
    transcodeRequestLambdaFn.addToRolePolicy(new PolicyStatement({
      actions: [
        's3:PutObject'
      ],
      resources: [
        `${outputBucket.bucketArn}/*`
      ]
    }))
    transcodeRequestLambdaFn.addToRolePolicy(new PolicyStatement({
      actions: [
        'dynamodb:GetItem',
        'dynamodb:PutItem',
        'dynamodb:UpdateItem',
        'dynamodb:DeleteItem',
        'dynamodb:Query',
      ],
      resources: [
        `arn:aws:dynamodb:${Aws.REGION}:${Aws.ACCOUNT_ID}:table/${jobsTable.tableName}`,
      ]
    }))
    transcodeRequestLambdaFn.addToRolePolicy(new PolicyStatement({
      actions: [
        'dynamodb:Query',
      ],
      resources: [
        `arn:aws:dynamodb:${Aws.REGION}:${Aws.ACCOUNT_ID}:table/${jobsTable.tableName}/index/lsi`,
      ]
    }))


    // Lambda Function SNS Subscription
    snsTopic.addSubscription( new subs.LambdaSubscription(transcodeRequestLambdaFn) )


    /**
     * Eventbridge role to trigger λ Function
     * AWS Elemental Media Convert generates events that are picked by Eventbridge
     */
    const jobNotificationsToλRole = new Role(this, `${props.prefix}-job-notification-role-${props.stage}`, {
      roleName: `${props.prefix}-job-notification-role-${props.stage}`,
      assumedBy: new ServicePrincipal('events.amazonaws.com'),
    })
    jobNotificationsToλRole.addToPolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ["sts:AssumeRole"],
        resources: ["*"]
      })
    )
    jobNotificationsToλRole.addToPolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: [
          'lambda:InvokeFunction'
        ],
        resources: [
          transcodeRequestLambdaFn.functionArn
        ]
      })
    )
    
    /**
     * Eventbridge Rule
     */
    const jobNotificationsEventsRule = new events.Rule(this, `${props.prefix}-job-notification-rule-${props.stage}`, {
      enabled: true,
      eventPattern: {
        source: [
          'aws.mediaconvert',
        ],
        detail: {
          status: [
            'COMPLETE',
            'PROGRESSING',
            'CANCELED',
            'ERROR',
          ],
        }
      },
      targets: [
        new targets.LambdaFunction(transcodeRequestLambdaFn)
      ]
    })
    targets.addLambdaPermission(jobNotificationsEventsRule, transcodeRequestLambdaFn)
    

    /**
     * API GW Defintion
     */
    const restApi = new RestApi(this, `${props.prefix}-api-gateway-${props.stage}`, {
      restApiName: `${props.prefix}-api-gateway-${props.stage}`,
      description: 'Sample Video Transcode Api',
      deployOptions: {
        stageName: props.stage,
      },
      defaultCorsPreflightOptions: {
        allowOrigins: Cors.ALL_ORIGINS,
        allowHeaders: [
          'Content-Type',
          'X-Amz-Date',
          'Authorization',
          'X-Api-Key',
          'X-Amz-Security-Token',
          'X-Auth-Token',
          'Cognito-Refresh-Token',
          'User-Agent',
        ],
        allowMethods: ['OPTIONS', 'GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
        allowCredentials: true
      }
    })
    restApi.root.addMethod('GET', new LambdaIntegration(transcodeRequestLambdaFn), {
      authorizationType: AuthorizationType.NONE
    })
    restApi.root.addResource('jobs').addMethod('GET', new LambdaIntegration(transcodeRequestLambdaFn))
    restApi.root.addResource('files').addResource('{filename}').addMethod('GET', new LambdaIntegration(transcodeRequestLambdaFn))
    restApi.root.addResource('signed-cookies').addMethod('GET', new LambdaIntegration(transcodeRequestLambdaFn))

  }

}
