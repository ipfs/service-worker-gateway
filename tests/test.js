import { test, expect } from '@playwright/test';
import { playwright } from 'test-util-ipfs-example';

// Setup
const play = test.extend({
  ...playwright.servers(),
});

play.describe('bundle Helia with Webpack:', () => {
  // DOM
  const nameInput = "#file-name"
  const contentInput = "#file-content"
  const submitBtn = "#add-submit"
  const output = "#output"

  play.beforeEach(async ({servers, page}) => {
    await page.goto(`http://localhost:${servers[0].port}/`);
  })

  play('should properly initialized a Helia node and add/get a file', async ({ page }) => {
    const fileName = 'test.txt'
    const stringToUse = 'Hello world!'

    await page.fill(nameInput, fileName)
    await page.fill(contentInput, stringToUse)
    await page.click(submitBtn)

    await page.waitForSelector(`${output}:has-text("/bafkreigaknpexyvxt76zgkitavbwx6ejgfheup5oybpm77f3pxzrvwpfdi")`)

    const outputContent = await page.textContent(output)

    expect(outputContent).toContain("bafkreigaknpexyvxt76zgkitavbwx6ejgfheup5oybpm77f3pxzrvwpfdi");
    expect(outputContent).toContain("https://ipfs.io/ipfs/bafkreigaknpexyvxt76zgkitavbwx6ejgfheup5oybpm77f3pxzrvwpfdi");
    expect(outputContent).toContain(fileName);
    expect(outputContent).toContain(stringToUse);
  });
});
