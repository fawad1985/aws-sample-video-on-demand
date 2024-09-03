export default async function (event: any) {
  return {
    service: 'sample-video-transcode',
    version: '1.0',
    stage: process.env.STAGE!,
  }
}
  