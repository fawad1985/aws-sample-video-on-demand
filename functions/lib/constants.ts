export let jobSettings: any = {
  'OutputGroups': [
    {
      'Name': 'Apple HLS',
      'Outputs': [],
      'OutputGroupSettings': {
        'Type': 'HLS_GROUP_SETTINGS',
        'HlsGroupSettings': {
          'Destination': 's3:///output/',
        }
      }
    }
  ],
  'Inputs': [
    {
      'AudioSelectors': {
        'Audio Selector 1': {
          'Offset': 0,
          'DefaultSelection': 'DEFAULT',
          'ProgramSelection': 1
        }
      },
      'VideoSelector': {
        'ColorSpace': 'FOLLOW'
      },
      'FilterEnable': 'AUTO',
      'PsiControl': 'USE_PSI',
      'FilterStrength': 0,
      'DeblockFilter': 'DISABLED',
      'DenoiseFilter': 'DISABLED',
      'TimecodeSource': 'ZEROBASED',
      'FileInput': 's3key'
    }
  ]
}
