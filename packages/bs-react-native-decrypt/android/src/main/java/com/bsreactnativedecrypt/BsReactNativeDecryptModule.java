package com.bsreactnativedecrypt;

import androidx.annotation.NonNull;

import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.module.annotations.ReactModule;

import java.math.BigInteger;

@ReactModule(name = BsReactNativeDecryptModule.NAME)
public class BsReactNativeDecryptModule extends ReactContextBaseJavaModule {
  public static final String NAME = "BsReactNativeDecrypt";

  public BsReactNativeDecryptModule(ReactApplicationContext reactContext) {
    super(reactContext);
  }

  @Override
  @NonNull
  public String getName() {
    return NAME;
  }


  @ReactMethod
  public void decryptNeo3(String key, String password, Promise promise) {
    try {
      byte[] privateKeyBytes = io.neow3j.crypto.NEP2.decrypt(password, key).getPrivateKey().getBytes();
      String privateKey = io.neow3j.utils.Numeric.toHexStringNoPrefix(privateKeyBytes);
      promise.resolve(privateKey);
    } catch (Exception e) {
      promise.reject(e);
    }
  }
  @ReactMethod
  public void decryptNeoLegacy(String key, String password, Promise promise){
    try {
      BigInteger privateKeyInteger = io.neow3jLegacy.crypto.NEP2.decrypt(password, key).getPrivateKey();
      String privateKey = io.neow3j.utils.Numeric.toHexStringNoPrefix(privateKeyInteger);
      promise.resolve(privateKey);
    } catch (Exception e) {
      promise.reject(e);
    }
  }
}
