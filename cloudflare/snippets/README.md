# Cloudflare Snippets

[Cloudflare Snippets](https://developers.cloudflare.com/rules/snippets/) for `inbrowser.link` and `inbrowser.dev`. See the header comment in each `.js` file for details.

## File conventions

- `snippet_name.js` -- the snippet (filename without `.js` = Cloudflare snippet name, underscores required by Cloudflare)
- `snippet_name.js.rules` -- [Cloudflare expression](https://developers.cloudflare.com/ruleset-engine/rules-language/expressions/) that controls when the snippet runs
- `snippet_name.test.js` -- tests (`node:test`, zero external deps)

## Testing

```console
$ npm run test:cloudflare
```

## Deployment

Automatic via CI on staging/production deploy (see `.github/scripts/deploy-snippets.sh`).

Required secrets per environment:

- `CF_SNIPPETS_TOKEN_STAGING` -- API token with Zone > Snippets > Edit for `inbrowser.dev`
- `CF_SNIPPETS_TOKEN_PRODUCTION` -- API token with Zone > Snippets > Edit for `inbrowser.link`
