export function getWontFixTests (): string[] {
  return [
    // these tests make HTTP requests to hosts that are not supported by the
    // service worker gateway
    'TestDNSLinkGatewayUnixFSDirectoryListing',
    'TestRedirectsFileSupportWithDNSLink',

    // these tests want to ignore the format arg and return a text/html
    // content-type which is not in the spec?
    // https://github.com/ipfs/gateway-conformance/issues/256
    'TestDagPbConversion/GET_UnixFS_with_format=json_%28not_dag-json%29_is_no-op_%28no_conversion%29/Header_Content-Type',
    'TestDagPbConversion/GET_UnixFS_with_format=cbor_%28not_dag-cbor%29_is_no-op_%28no_conversion%29/Header_Content-Type',
    'TestDagPbConversion/GET_UnixFS_with_%27Accept:_application%2Fjson%27_%28not_dag-json%29_is_no-op_%28no_conversion%29/Header_Content-Type',
    'TestDagPbConversion/GET_UnixFS_with_%27Accept:_application%2Fcbor%27_%28not_dag-cbor%29_is_no-op_%28no_conversion%29/Header_Content-Type',

    // kubo-specific tests
    'TestUnixFSDirectoryListing/path_gw:_backlink_on_root_CID_should_be_hidden_%28TODO:_cleanup_Kubo-specifics%29',
    'TestUnixFSDirectoryListing/path_gw:_dir_listing_HTML_response_%28TODO:_cleanup_Kubo-specifics%29',
    'TestUnixFSDirectoryListingOnSubdomainGateway/backlink_on_root_CID_should_be_hidden_%28TODO:_cleanup_Kubo-specifics%29',
    'TestUnixFSDirectoryListingOnSubdomainGateway/Regular_dir_listing_HTML_%28TODO:_cleanup_Kubo-specifics%29',
    'TestGatewaySubdomains/valid_breadcrumb_links_in_the_header_of_directory_listing_at_%7Bcid%7D.ipfs.example.com%2Fsub%2Fdir_%28TODO:_cleanup_Kubo-specifics%29',

    // not sure why this needs to error
    'TestPathing/GET_DAG-JSON_traversal_returns_501_if_there_is_path_remainder',
    'TestPathing/GET_DAG-CBOR_traversal_returns_501_if_there_is_path_remainder',

    // these tests require the block /ipfs/bafybeib3ffl2teiqdncv3mkz4r23b5ctrwkzrrhctdbne6iboayxuxk5ui/root2/root3/root4
    // to be in the blockstore already
    'TestNativeDag/Cache_control_HTTP_headers_%28json%29',
    'TestGatewayCache/HEAD_for_%2Fipfs%2F_with_only-if-cached_succeeds_when_in_local_datastore',
    'TestGatewayCache/GET_for_%2Fipfs%2F_with_only-if-cached_succeeds_when_in_local_datastore',

    // this test sends an empty weak etag (W/"") which should disable etag
    // matching but instead it expects it to match and return a 304?
    // https://github.com/ipfs/gateway-conformance/issues/261
    'TestGatewayCache/GET_for_%2Fipfs%2F_dir_listing_with_matching_weak_Etag_in_If-None-Match_returns_304_Not_Modified',

    // this test requires reporting an unrelated error
    // https://github.com/ipfs/gateway-conformance/issues/269
    'TestRedirectsFileSupport/invalid_file:_request_for_$INVALID_REDIRECTS_DIR_HOSTNAME%2Fnot-found_returns_error_about_invalid_redirects_file',
    'TestRedirectsFileSupport/invalid_file:_request_for_$TOO_LARGE_REDIRECTS_DIR_HOSTNAME%2Fnot-found_returns_error_about_too_large_redirects_file',

    // this test makes HTTP requests to non-localhost domains
    // https://github.com/ipfs/gateway-conformance/issues/270
    'TestRedirectsFileWithIfNoneMatchHeader',

    // playwright cannot intercept redirects so we cannot assert 301/302 status
    // codes were received
    'TestRedirectsFileSupport/request_for_%7Bcid%7D.ipfs.example.com%2Fredirect-one_redirects_with_default_of_301%2C_per__redirects_file',
    'TestRedirectsFileSupport/request_for_%7Bcid%7D.ipfs.example.com%2F301-redirect-one_redirects_with_301%2C_per__redirects_file',
    'TestRedirectsFileSupport/request_for_%7Bcid%7D.ipfs.example.com%2Fposts%2F:year%2F:month%2F:day%2F:title_redirects_with_301_and_placeholders%2C_per__redirects_file',
    'TestRedirectsFileSupport/request_for_%7Bcid%7D.ipfs.example.com%2Fsplat%2Fone.html_redirects_with_301_and_splat_placeholder%2C_per__redirects_file',
    'TestRedirectsFileSupport/newline:_request_for_$NEWLINE_REDIRECTS_DIR_HOSTNAME%2Fredirect-one_redirects_with_default_of_301%2C_per__redirects_file',

    // these test that responses are redirects - redirects are followed by
    // browsers automatically so we can't intercept the redirect
    'TestGatewaySubdomains',
    'TestGatewaySubdomainAndIPNS',
    'TestSubdomainGatewayDNSLinkInlining',
    'TestRedirectCanonicalIPNS',
    'TestUnixFSDirectoryListing/path_gw:_redirect_dir_listing_to_URL_with_trailing_slash',
    'TestUnixFSDirectoryListingOnSubdomainGateway',
    'TestGatewaySubdomains/request_for_example.com%2Fipfs%2F%7Bcid%7D_redirects_to_%7Bcid%7D.ipfs.example.com',

    // does not apply to service worker
    'TestProxyTunnelGatewaySubdomains',
    'TestProxyGatewaySubdomains',

    // this is the wrong way round
    // https://github.com/ipfs/specs/issues/521
    'TestTrustlessCarOrderAndDuplicates/GET_CAR_with_Accept_and_%3Fformat%2C_specific_Accept_header_is_prioritized',

    // last few tests
    'TestTar/GET_TAR_with_relative_paths_inside_root_works',
    'TestGatewaySymlink/Test_the_directory_listing',
    'TestGatewaySymlink/Test_the_symlink',
    'TestTrustlessCarEntityBytes/GET_CAR_with_entity-bytes_succeeds_even_if_the_gateway_is_missing_a_block_before_the_requested_range_%28Accept_Header%29/Body',
    'TestTrustlessCarEntityBytes/GET_CAR_with_entity-bytes_succeeds_even_if_the_gateway_is_missing_a_block_before_the_requested_range_%28format=car%29/Body',
    'TestTrustlessCarEntityBytes/GET_CAR_with_entity-bytes_succeeds_even_if_the_gateway_is_missing_a_block_after_the_requested_range_%28Accept_Header%29/Body',
    'TestTrustlessCarEntityBytes/GET_CAR_with_entity-bytes_succeeds_even_if_the_gateway_is_missing_a_block_after_the_requested_range_%28format=car%29/Body'
  ]
}
