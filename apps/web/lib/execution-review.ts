import { getAddress, type Address } from 'viem';

interface SellReviewTerms {
  account: Address;
  marketAddress: Address;
  baseAmountAtoms: string;
  sizeRaw: string;
  minimumQuoteAtoms: string;
  maximumGasCostWei: string;
}

interface BuyReviewTerms {
  account: Address;
  marketAddress: Address;
  approvalSpender: Address;
  quoteAmountAtoms: string;
  quoteSizeRaw: string;
  minimumBaseAtoms: string;
  approvalRequired: boolean;
  approvalAmountAtoms: string;
  maximumApprovalGasCostWei: string;
  maximumBuyGasCostWei: string | null;
  exactBuySimulationPassed: boolean;
}

interface RevocationReviewTerms {
  account: Address;
  tokenAddress: Address;
  spender: Address;
  allowanceAtoms: string;
  targetAllowanceAtoms: string;
  maximumGasCostWei: string;
}

function sameAddress(left: Address, right: Address): boolean {
  return getAddress(left) === getAddress(right);
}

export function assertSellRevalidation(previous: SellReviewTerms, fresh: SellReviewTerms): void {
  if (!sameAddress(previous.account, fresh.account) || !sameAddress(previous.marketAddress, fresh.marketAddress) ||
    previous.baseAmountAtoms !== fresh.baseAmountAtoms || previous.sizeRaw !== fresh.sizeRaw) {
    throw new Error('The sell transaction changed. Review a new simulation before opening the wallet.');
  }
  if (BigInt(fresh.minimumQuoteAtoms) < BigInt(previous.minimumQuoteAtoms)) {
    throw new Error('The protected USDC output worsened. Review a new simulation before opening the wallet.');
  }
  if (BigInt(fresh.maximumGasCostWei) > BigInt(previous.maximumGasCostWei)) {
    throw new Error('The sell gas ceiling increased. Review a new simulation before opening the wallet.');
  }
}

export function assertBuyRevalidation(previous: BuyReviewTerms, fresh: BuyReviewTerms): void {
  if (!sameAddress(previous.account, fresh.account) || !sameAddress(previous.marketAddress, fresh.marketAddress) ||
    previous.quoteAmountAtoms !== fresh.quoteAmountAtoms || previous.quoteSizeRaw !== fresh.quoteSizeRaw) {
    throw new Error('The buy transaction changed. Review a new preparation before opening the wallet.');
  }
  if (previous.approvalRequired) {
    if (!fresh.approvalRequired || !sameAddress(previous.approvalSpender, fresh.approvalSpender) ||
      previous.approvalAmountAtoms !== fresh.approvalAmountAtoms) {
      throw new Error('The USDC approval requirement changed. Review a new preparation before opening the wallet.');
    }
    if (BigInt(fresh.maximumApprovalGasCostWei) > BigInt(previous.maximumApprovalGasCostWei)) {
      throw new Error('The approval gas ceiling increased. Review a new preparation before opening the wallet.');
    }
    return;
  }
  if (fresh.approvalRequired || !fresh.exactBuySimulationPassed || fresh.maximumBuyGasCostWei === null || previous.maximumBuyGasCostWei === null) {
    throw new Error('The exact buy is no longer transaction-ready. Review a new preparation.');
  }
  if (BigInt(fresh.minimumBaseAtoms) < BigInt(previous.minimumBaseAtoms)) {
    throw new Error('The protected MON output worsened. Review a new preparation before opening the wallet.');
  }
  if (BigInt(fresh.maximumBuyGasCostWei) > BigInt(previous.maximumBuyGasCostWei)) {
    throw new Error('The buy gas ceiling increased. Review a new preparation before opening the wallet.');
  }
}

export function assertRevocationRevalidation(previous: RevocationReviewTerms, fresh: RevocationReviewTerms): void {
  if (!sameAddress(previous.account, fresh.account) || !sameAddress(previous.tokenAddress, fresh.tokenAddress) ||
    !sameAddress(previous.spender, fresh.spender) || previous.allowanceAtoms !== fresh.allowanceAtoms ||
    previous.targetAllowanceAtoms !== '0' || fresh.targetAllowanceAtoms !== '0') {
    throw new Error('The residual allowance changed. Check it again before opening the wallet.');
  }
  if (BigInt(fresh.maximumGasCostWei) > BigInt(previous.maximumGasCostWei)) {
    throw new Error('The revocation gas ceiling increased. Review a new preparation before opening the wallet.');
  }
}
