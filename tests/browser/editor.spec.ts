import { expect, test } from '@playwright/test';
import { OrthographicCamera, Vector3 } from 'three';
import type { Design, HouseModel } from '../../src/domain/types';

test('furnishes both floors and restores their finishes on a second device', async ({ page, browser }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await expect(page.getByTestId('scene')).toHaveAttribute('data-ready', 'true');
  await page.getByRole('button', { name: 'Designs', exact: true }).click();
  await page.getByRole('button', { name: 'New design', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Design name', exact: true })).toHaveValue('Untitled layout');
  const name = `House design ${Date.now().toString(36).slice(-4)}`;
  await page.getByRole('textbox', { name: 'Design name', exact: true }).fill(name);
  await page.getByRole('textbox', { name: 'Design name', exact: true }).press('Enter');
  await expect(page.getByTestId('save-status')).toHaveText('Saved');
  await page.screenshot({ path: 'test-results/desktop.png' });
  await page.getByRole('button', { name: 'Rooms', exact: true }).click();
  await page.getByRole('button', { name: 'Select room Kitchen / dining', exact: true }).click();
  await page.getByRole('button', { name: 'Tile', exact: true }).click();
  await page.getByRole('button', { name: 'Floor colour #c6cfbf', exact: true }).click();
  await page.getByRole('button', { name: 'Paint kitchen hall', exact: true }).click();
  await page.getByRole('button', { name: 'Wall colour #93a99b', exact: true }).click();
  await page.getByRole('button', { name: 'Furniture', exact: true }).click();
  await page.getByRole('button', { name: 'Add Writing desk', exact: true }).click();
  await page.getByRole('spinbutton', { name: 'Width', exact: true }).fill('1.4');
  await page.getByRole('spinbutton', { name: 'Width', exact: true }).press('Enter');
  await page.getByRole('button', { name: 'Turn 90°', exact: true }).click();
  await page.getByRole('button', { name: 'Top', exact: true }).click();
  await page.getByRole('button', { name: 'First floor', exact: true }).click();
  await page.getByRole('button', { name: 'Rooms', exact: true }).click();
  await page.getByRole('button', { name: 'Select room Bedroom one', exact: true }).click();
  await page.getByRole('button', { name: 'Floor colour #c2b0b6', exact: true }).click();
  await page.getByRole('button', { name: 'Furniture', exact: true }).click();
  await page.getByRole('button', { name: 'Add Indoor plant', exact: true }).click();
  await expect(page.getByTestId('save-status')).toHaveText('Saved');
  await page.screenshot({ path: 'test-results/first-floor.png' });
  const second = await browser.newContext(); const other = await second.newPage();
  await other.goto('/');
  await other.getByRole('button', { name: 'Designs', exact: true }).click();
  await other.getByRole('button', { name: `Open ${name}`, exact: true }).click();
  await other.getByRole('button', { name: 'Rooms', exact: true }).click();
  await other.getByRole('button', { name: 'Select room Kitchen / dining', exact: true }).click();
  await expect(other.getByRole('button', { name: 'Tile', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(other.getByRole('button', { name: 'Floor colour #c6cfbf', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await other.getByRole('button', { name: 'Paint kitchen hall', exact: true }).click();
  await expect(other.getByRole('textbox', { name: 'Wall colour hex', exact: true })).toHaveValue('#93a99b');
  await other.getByRole('button', { name: /^Select Writing desk / }).click();
  await expect(other.getByRole('spinbutton', { name: 'Width', exact: true })).toHaveValue('1.4');
  await expect(other.getByRole('spinbutton', { name: 'Rotation', exact: true })).toHaveValue('90');
  await other.getByRole('button', { name: 'First floor', exact: true }).click();
  await other.getByRole('button', { name: 'Rooms', exact: true }).click();
  await other.getByRole('button', { name: 'Select room Bedroom one', exact: true }).click();
  await expect(other.getByRole('button', { name: 'Floor colour #c2b0b6', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await other.getByRole('button', { name: /^Select Indoor plant / }).click();
  await expect(other.getByRole('spinbutton', { name: 'Width', exact: true })).toHaveValue('0.45');
  expect(errors).toEqual([]);
  await second.close();
});

test('uses mobile panels without horizontal overflow', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await context.newPage(); await page.goto('/');
  await expect(page.getByTestId('scene')).toHaveAttribute('data-ready', 'true');
  await page.getByRole('button', { name: 'Furniture', exact: true }).tap();
  await page.getByRole('button', { name: 'Add Lounge chair', exact: true }).tap();
  await expect(page.getByRole('spinbutton', { name: 'Width', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Move right', exact: true }).tap();
  await page.getByRole('button', { name: 'Close mobile panel', exact: true }).tap();
  await page.getByRole('button', { name: 'Top', exact: true }).tap();
  await page.getByRole('button', { name: 'First floor', exact: true }).tap();
  await page.getByRole('button', { name: 'Rooms', exact: true }).tap();
  await page.getByRole('button', { name: 'Select room Bedroom two', exact: true }).tap();
  await page.getByRole('button', { name: 'Wood', exact: true }).tap();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'Close mobile panel', exact: true }).tap();
  const smallTargets = await page.locator('button,input,select,a').evaluateAll((elements) => elements.filter((element) => {
    const bounds = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    return style.visibility !== 'hidden' && bounds.width > 0 && bounds.height > 0 && (bounds.width < 44 || bounds.height < 44);
  }).map((element) => element.getAttribute('aria-label') ?? element.textContent));
  expect(smallTargets).toEqual([]);
  for (const width of [375, 768]) {
    await page.setViewportSize({ width, height: 844 });
    await expect(page.getByRole('navigation', { name: 'Mobile editor panels', exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: 'test-results/mobile.png' });
  await context.close();
});

test('drags furniture in both views and supports keyboard undo', async ({ page, request }) => {
  const response = await request.post('/api/designs', { data: { name: 'Canvas drag check' } });
  const created: Design = await response.json();
  await request.put(`/api/designs/${created.id}`, { data: { ...created, furniture: [] } });
  const model: HouseModel = await (await request.get('/api/house')).json();
  await page.goto('/');
  await expect(page.getByTestId('scene')).toHaveAttribute('data-ready', 'true');
  await page.getByRole('combobox', { name: 'Wall visibility', exact: true }).selectOption('hidden');
  await page.getByRole('button', { name: 'Add Woven rug', exact: true }).click();
  await expect(page.getByTestId('save-status')).toHaveText('Saved');
  let writeCount = 0;
  page.on('request', (request) => { if (request.method() === 'PUT') writeCount += 1; });

  for (const view of ['Top', '3D'] as const) {
    await page.getByRole('button', { name: view, exact: true }).click();
    await page.getByRole('button', { name: 'Reset camera', exact: true }).click();
    await page.waitForTimeout(150);
    const horizontal = page.getByRole('spinbutton', { name: 'Position X', exact: true });
    const vertical = page.getByRole('spinbutton', { name: 'Position Z', exact: true });
    const original = { x: Number(await horizontal.inputValue()), z: Number(await vertical.inputValue()) };
    const bounds = (await page.locator('canvas').boundingBox())!;
    const zoom = Math.max(12, Math.min((bounds.width - 36) / (view === 'Top' ? model.width + 0.8 : model.width + model.depth * 0.65), (bounds.height - 60) / (view === 'Top' ? model.depth + 0.8 : model.depth * 0.55 + 3.2)));
    const camera = new OrthographicCamera(-bounds.width / 2, bounds.width / 2, bounds.height / 2, -bounds.height / 2, 0.1, 100);
    camera.zoom = zoom;
    const centre = new Vector3(model.width / 2, 0, model.depth / 2);
    camera.position.copy(centre).add(view === 'Top' ? new Vector3(0, 15, 0.001) : new Vector3(10, 12, 10));
    camera.lookAt(centre); camera.updateProjectionMatrix(); camera.updateMatrixWorld();
    const point = new Vector3(original.x, 0.035, original.z).project(camera);
    const pointer = { x: bounds.x + (point.x + 1) * bounds.width / 2, y: bounds.y + (1 - point.y) * bounds.height / 2 };
    const previousWrites = writeCount;
    await page.mouse.move(pointer.x, pointer.y);
    await page.mouse.down();
    await page.mouse.move(pointer.x - 24, pointer.y + 8, { steps: 5 });
    await page.waitForTimeout(850);
    expect(writeCount).toBe(previousWrites);
    await page.mouse.up();
    await expect.poll(async () => `${await horizontal.inputValue()},${await vertical.inputValue()}`).not.toBe(`${original.x},${original.z}`);
    await expect(page.getByTestId('save-status')).toHaveText('Saved');
    expect(writeCount).toBe(previousWrites + 1);
  }

  const before = Number(await page.getByRole('spinbutton', { name: 'Position X', exact: true }).inputValue());
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('spinbutton', { name: 'Position X', exact: true })).toHaveValue(String(Math.round((before + 0.1) * 100) / 100));
  await page.keyboard.press('Control+z');
  await expect(page.getByRole('spinbutton', { name: 'Position X', exact: true })).toHaveValue(String(before));
  const width = page.getByRole('spinbutton', { name: 'Width', exact: true });
  await width.fill('-1'); await width.press('Enter');
  await expect(width).toHaveValue('2');
  await expect(page.getByRole('alert')).toHaveText('Use positive dimensions and a valid colour.');
});

test('preserves a conflict between browser sessions and saves the draft as a new design', async ({ browser, request }) => {
  const name = `Conflict check ${Date.now()}`;
  await request.post('/api/designs', { data: { name } });
  const firstContext = await browser.newContext(); const secondContext = await browser.newContext();
  const first = await firstContext.newPage(); const second = await secondContext.newPage();
  for (const page of [first, second]) {
    await page.goto('/');
    await expect(page.getByRole('textbox', { name: 'Design name', exact: true })).toHaveValue(name);
    await page.getByRole('button', { name: 'Rooms', exact: true }).click();
    await page.getByRole('button', { name: 'Select room Lounge', exact: true }).click();
  }
  await first.getByRole('button', { name: 'Floor colour #93a99b', exact: true }).click();
  await expect(first.getByTestId('save-status')).toHaveText('Saved');
  await second.getByRole('button', { name: 'Floor colour #bd8270', exact: true }).click();
  await expect(second.getByTestId('save-status')).toHaveText('Design conflict');
  await second.reload();
  await expect(second.getByRole('button', { name: 'Recover as new design', exact: true })).toBeVisible();
  await second.getByRole('button', { name: 'Recover as new design', exact: true }).click();
  await expect(second.getByRole('textbox', { name: 'Design name', exact: true })).toHaveValue(`${name} recovered`);
  await second.getByRole('button', { name: 'Rooms', exact: true }).click();
  await second.getByRole('button', { name: 'Select room Lounge', exact: true }).click();
  await expect(second.getByRole('button', { name: 'Floor colour #bd8270', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await first.reload();
  await first.getByRole('button', { name: 'Rooms', exact: true }).click();
  await first.getByRole('button', { name: 'Select room Lounge', exact: true }).click();
  await expect(first.getByRole('button', { name: 'Floor colour #93a99b', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await firstContext.close(); await secondContext.close();
});

test('recovers an offline draft and reaches every wall face through room controls', async ({ page, request }) => {
  test.setTimeout(120000);
  await request.post('/api/designs', { data: { name: `Draft check ${Date.now()}` } });
  const model: HouseModel = await (await request.get('/api/house')).json();
  await page.goto('/');
  await page.route('**/api/designs/*', (route) => route.request().method() === 'PUT' ? route.abort('failed') : route.continue());
  await page.getByRole('button', { name: 'Rooms', exact: true }).click();
  await page.getByRole('button', { name: 'Select room Kitchen / dining', exact: true }).click();
  await page.getByRole('button', { name: 'Floor colour #93a6b2', exact: true }).click();
  await expect(page.getByTestId('save-status')).toHaveText('Save failed');
  await page.reload();
  await expect(page.getByRole('button', { name: 'Recover draft', exact: true })).toBeVisible();
  await page.unroute('**/api/designs/*');
  await page.getByRole('button', { name: 'Recover draft', exact: true }).click();
  await expect(page.getByTestId('save-status')).toHaveText('Saved');
  await page.getByRole('button', { name: 'Rooms', exact: true }).click();
  await page.getByRole('button', { name: 'Select room Kitchen / dining', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Floor colour #93a6b2', exact: true })).toHaveAttribute('aria-pressed', 'true');
  for (const floor of model.floors) {
    await page.getByRole('button', { name: floor.name, exact: true }).click();
    for (const face of floor.walls.flatMap((wall) => wall.faces)) {
      await page.getByRole('combobox', { name: 'Select any wall face', exact: true }).selectOption(face.id);
      await expect(page.getByRole('combobox', { name: 'Wall face', exact: true })).toHaveValue(face.id);
      await expect(page.getByRole('textbox', { name: 'Wall colour hex', exact: true })).toBeVisible();
    }
  }
});
