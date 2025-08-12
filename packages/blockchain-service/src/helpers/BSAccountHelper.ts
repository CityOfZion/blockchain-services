export type TBSAccountHelperPredicateParams = {
  address: string
  blockchain: string
}

export class BSAccountHelper {
  static predicate({ address, blockchain }: TBSAccountHelperPredicateParams) {
    return (account: TBSAccountHelperPredicateParams) =>
      address === account.address && blockchain === account.blockchain
  }

  static predicateNot({ address, blockchain }: TBSAccountHelperPredicateParams) {
    return (account: TBSAccountHelperPredicateParams) =>
      address !== account.address || blockchain !== account.blockchain
  }
}
