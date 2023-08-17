#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(BsReactNativeDecrypt, NSObject)

RCT_EXTERN_METHOD(decryptNeoLegacy:(NSString)key withPassphrase:(NSString)passphrase
                 withResolver:(RCTPromiseResolveBlock)resolve
                 withRejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(decryptNeo3:(NSString)key withPassphrase:(NSString)passphrase
                 withResolver:(RCTPromiseResolveBlock)resolve
                 withRejecter:(RCTPromiseRejectBlock)reject)

+ (BOOL)requiresMainQueueSetup
{
  return NO;
}

@end
