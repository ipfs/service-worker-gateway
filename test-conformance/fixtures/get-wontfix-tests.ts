export function getWontFixTests (): string[] {
  return [
    // these tests make HTTP requests to hosts that are not supported by the
    // service worker gateway
    'TestDNSLinkGatewayUnixFSDirectoryListing',

    // browsers always send an Accept header which includes
    // application/octet-stream so this test will always fail
    'TestNativeDag/HEAD_plain_JSON_codec_with_no_explicit_format_returns_HTTP_200/Header_Content-Type',

    // this test wants to ignore the format arg and return a text/html
    // content-type which is not in the spec
    // https://github.com/ipfs/gateway-conformance/issues/256
    'TestDagPbConversion/GET_UnixFS_with_format=json_%28not_dag-json%29_is_no-op_%28no_conversion%29',
    'TestDagPbConversion/GET_UnixFS_with_format=cbor_%28not_dag-cbor%29_is_no-op_%28no_conversion%29',

    // we cannot send an accept header
    'TestNativeDag/GET_plain_JSON_codec_on_%2Fipfs_with_Accept:_text%2Fhtml_returns_HTML_%28dag-index-html%29',
    'TestNativeDag/GET_plain_CBOR_codec_on_%2Fipfs_with_Accept:_text%2Fhtml_returns_HTML_%28dag-index-html%29',
    'TestNativeDag/Convert_application%2Fvnd.ipld.dag-cbor_to_text%2Fhtml',
    'TestGatewayJSONCborAndIPNS/GET_plain_JSON_codec_on_%2Fipns_with_Accept:_text%2Fhtml_returns_HTML_%28dag-index-html%29',
    'TestGatewayJSONCborAndIPNS/GET_plain_CBOR_codec_on_%2Fipns_with_Accept:_text%2Fhtml_returns_HTML_%28dag-index-html%29',
    'TestDagPbConversion/GET_UnixFS_with_%27Accept:_application%2Fjson%27_%28not_dag-json%29_is_no-op_%28no_conversion%29',
    'TestDagPbConversion/GET_UnixFS_with_%27Accept:_application%2Fcbor%27_%28not_dag-cbor%29_is_no-op_%28no_conversion%29',

    // kubo-specific tests
    'TestUnixFSDirectoryListing/path_gw:_backlink_on_root_CID_should_be_hidden_%28TODO:_cleanup_Kubo-specifics%29',
    'TestUnixFSDirectoryListing/path_gw:_dir_listing_HTML_response_%28TODO:_cleanup_Kubo-specifics%29',
    'TestUnixFSDirectoryListingOnSubdomainGateway/backlink_on_root_CID_should_be_hidden_%28TODO:_cleanup_Kubo-specifics%29',
    'TestUnixFSDirectoryListingOnSubdomainGateway/Regular_dir_listing_HTML_%28TODO:_cleanup_Kubo-specifics%29',
    'TestGatewaySubdomains/valid_breadcrumb_links_in_the_header_of_directory_listing_at_%7Bcid%7D.ipfs.example.com%2Fsub%2Fdir_%28TODO:_cleanup_Kubo-specifics%29',

    // not sure why this needs to error
    'TestPathing/GET_DAG-JSON_traversal_returns_501_if_there_is_path_remainder',
    'TestPathing/GET_DAG-CBOR_traversal_returns_501_if_there_is_path_remainder',

    // we cannot send a cache-control header
    'TestNativeDag/Cache_control_HTTP_headers_%28json%29',
    'TestNativeDag/HEAD_plain_JSON_codec_with_only-if-cached_for_missing_block_returns_HTTP_412_Precondition_Failed',
    'TestNativeDag/HEAD_plain_CBOR_codec_with_only-if-cached_for_missing_block_returns_HTTP_412_Precondition_Failed',
    'TestGatewayCache/HEAD_for_%2Fipfs%2F_with_only-if-cached_fails_when_not_in_local_datastore',
    'TestGatewayCache/GET_for_%2Fipfs%2F_with_only-if-cached_fails_when_not_in_local_datastore',

    // we cannot send if-none-match header
    'TestGatewayCache/GET_for_%2Fipfs%2F_file_with_matching_Etag_in_If-None-Match_returns_304_Not_Modified',
    'TestGatewayCache/GET_for_%2Fipfs%2F_dir_with_index.html_file_with_matching_Etag_in_If-None-Match_returns_304_Not_Modified',
    'TestGatewayCache/GET_for_%2Fipfs%2F_file_with_matching_third_Etag_in_If-None-Match_returns_304_Not_Modified',
    'TestGatewayCache/GET_for_%2Fipfs%2F_file_with_matching_weak_Etag_in_If-None-Match_returns_304_Not_Modified',
    'TestGatewayCache/GET_for_%2Fipfs%2F_file_with_wildcard_Etag_in_If-None-Match_returns_304_Not_Modified',
    'TestGatewayCache/GET_for_%2Fipfs%2F_dir_listing_with_matching_weak_Etag_in_If-None-Match_returns_304_Not_Modified',
    'TestGatewayCacheWithIPNS/GET_for_%2Fipns%2F_file_with_matching_Etag_in_If-None-Match_returns_304_Not_Modified',
    'TestRedirectsFileWithIfNoneMatchHeader/request_for_%2F%2F%7Bdnslink%7D%2Fmissing-page_with_If-None-Match_returns_304',

    // redirects file isn't supported yet
    'TestRedirectsFileSupport',
    'TestRedirectsFileSupportWithDNSLink',
    'TestRedirectsFileWithIfNoneMatchHeader',

    // these test that responses are redirects - redirects are followed by
    // browsers automatically so we can't intercept the redirect
    'TestGatewaySubdomains',
    'TestGatewaySubdomainAndIPNS',
    'TestSubdomainGatewayDNSLinkInlining',

    // does not apply to service worker
    'TestProxyTunnelGatewaySubdomains',
    'TestProxyGatewaySubdomains',

    // this is the wrong way round
    // https://github.com/ipfs/specs/issues/521
    'TestTrustlessCarOrderAndDuplicates/GET_CAR_with_Accept_and_%3Fformat%2C_specific_Accept_header_is_prioritized',

    // last few tests
    'TestTar/GET_TAR_with_relative_paths_inside_root_works',
    'TestRedirectCanonicalIPNS/GET_for_%2Fipns%2F%7Bcidv0-like-b58-multihash-of-rsa-key%7D_redirects_to_%2Fipns%2F%7Bcidv1-libp2p-key-base36%7D',
    'TestRedirectCanonicalIPNS/GET_for_%2Fipns%2F%7Bb58-multihash-of-ed25519-key%7D_redirects_to_%2Fipns%2F%7Bcidv1-libp2p-key-base36%7D',
    'TestUnixFSDirectoryListing/path_gw:_redirect_dir_listing_to_URL_with_trailing_slash',
    'TestGatewayCache/GET_for_%2Fipfs%2F_unixfs_dir_listing_succeeds',
    'TestGatewayCache/GET_for_%2Fipfs%2F_unixfs_file_succeeds',
    'TestGatewayCache/GET_for_%2Fipfs%2F_unixfs_dir_with_index.html_succeeds',
    'TestGatewayCache/DirIndex_etag_is_based_on_xxhash%28.%2Fassets%2Fdir-index-html%29%2C_so_we_need_to_fetch_it_dynamically',
    'TestGatewayCache/GET_for_%2Fipfs%2F_dir_listing_with_matching_strong_Etag_in_If-None-Match_returns_304_Not_Modified',
    'TestGatewayCacheWithIPNS/GET_for_%2Fipns%2F_unixfs_dir_listing_succeeds',
    'TestGatewayCacheWithIPNS/GET_for_%2Fipns%2F_unixfs_dir_with_index.html_succeeds',
    'TestGatewayCacheWithIPNS/GET_for_%2Fipns%2F_unixfs_file_succeeds',
    'TestGatewaySymlink/Test_the_directory_listing',
    'TestGatewaySymlink/Test_the_symlink',
    'TestUnixFSDirectoryListingOnSubdomainGateway/redirect_dir_listing_to_URL_with_trailing_slash',
    'TestGatewaySubdomains/request_for_example.com%2Fipfs%2F%7Bcid%7D_redirects_to_%7Bcid%7D.ipfs.example.com',
    'TestGatewaySubdomains/valid_parent_directory_path_in_directory_listing_at_%7Bcid%7D.ipfs.example.com%2Fsub%2Fdir',
    'TestTrustlessCarPathing/GET_default_CAR_response_of_UnixFS_file_on_a_path_with_HAMT-sharded_directory_%28format=car%29/Body',
    'TestTrustlessCarPathing/GET_default_CAR_response_of_UnixFS_file_on_a_path_with_HAMT-sharded_directory_%28Accept_Header%29/Body',
    'TestTrustlessCarDagScopeBlock/GET_CAR_with_dag-scope=block_of_UnixFS_file_on_a_path_with_sharded_directory_%28format=car%29/Body',
    'TestTrustlessCarDagScopeBlock/GET_CAR_with_dag-scope=block_of_UnixFS_file_on_a_path_with_sharded_directory_%28Accept_Header%29/Body'
  ]
}
