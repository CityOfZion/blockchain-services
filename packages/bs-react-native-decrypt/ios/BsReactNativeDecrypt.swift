@objc(BsReactNativeDecrypt)
class BsReactNativeDecrypt: NSObject {
   @objc(decryptNeo3:withPassphrase:withResolver:withRejecter:)
   func decryptNeo3(key: String, passphrase: String, resolve:RCTPromiseResolveBlock, reject:RCTPromiseRejectBlock) -> Void {
    guard let privateKey = decryptKey(key, passphrase: passphrase) else {
        reject("Error", "Error to decrypt", nil)
        return
    }
    
    resolve(privateKey)
   }
    
    @objc(decryptNeoLegacy:withPassphrase:withResolver:withRejecter:)
    func decryptNeoLegacy(key: String, passphrase: String, resolve:RCTPromiseResolveBlock, reject:RCTPromiseRejectBlock) -> Void {
     guard let privateKey = decryptKey(key, passphrase: passphrase) else {
         reject("Error", "Error to decrypt", nil)
         return
     }
     
     resolve(privateKey)
    }

    func decryptKey(_ key: String, passphrase: String) -> String? {
        guard let encryptedKeyBytes = key.base58CheckDecodedBytes else {
            return nil
        }
        if encryptedKeyBytes.count != 39 {
            return nil
        }
        
        let addressHash = [UInt8](encryptedKeyBytes[3..<7])
        let encryptedHalf1 = [UInt8](encryptedKeyBytes[7..<23])
        let encryptedHalf2 = [UInt8](encryptedKeyBytes[23..<39])
        
        var crypto = Scrypt()
        
        let derived = crypto.scrypt(passphrase: [UInt8](passphrase.utf8), salt: addressHash)
        let derivedHalf1 = [UInt8](derived[0..<32])
        let derivedHalf2 = [UInt8](derived[32..<64])
        
        let decryptedHalf1 = AES.decrypt(bytes: encryptedHalf1, key: derivedHalf2, keySize: AES.KeySize.keySize256, pkcs7Padding: false).xor(other: [UInt8](derivedHalf1[0..<16]))
        let decryptedHalf2 = AES.decrypt(bytes: encryptedHalf2, key: derivedHalf2, keySize: AES.KeySize.keySize256, pkcs7Padding: false).xor(other: [UInt8](derivedHalf1[16..<32]))
        
        let decryptedKey = decryptedHalf1 + decryptedHalf2
        
        return decryptedKey.hexString
    }
}
