export function getWontFixTests (): string[] {
  return [
    // these tests are dependent upon supporting multi-range requests:
    // https://github.com/ipfs/helia-verified-fetch/pull/207
    'TestNativeDag/Convert_application%2Fvnd.ipld.dag-cbor_to_application%2Fvnd.ipld.dag-json_with_range_request_includes_correct_bytes_-_multi_range/Check_1',
    'TestNativeDag/Convert_application%2Fvnd.ipld.dag-cbor_to_application%2Fvnd.ipld.dag-json_with_range_request_includes_correct_bytes_-_multi_range',

    // these tests make HTTP requests to hosts that are not supported by the
    // service worker gateway
    'TestDNSLinkGatewayUnixFSDirectoryListing'
  ]
}
