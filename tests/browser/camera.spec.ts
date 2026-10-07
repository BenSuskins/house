import { expect, test, type Page } from '@playwright/test';

async function roomPositions(page: Page) {
  return page.locator('.room-label').evaluateAll((labels) => {
    const canvas = document.querySelector('canvas')!.getBoundingClientRect();
    return labels.map((label) => {
      const bounds = label.getBoundingClientRect();
      return { name: label.textContent, x: bounds.x + bounds.width / 2 - canvas.x - canvas.width / 2, y: bounds.y + bounds.height / 2 - canvas.y - canvas.height / 2 };
    });
  });
}

for (const view of ['3D', 'Top'] as const) {
  test(`preserves the ${view} camera during edits and panel changes`, async ({ page, request }) => {
    const design = await (await request.post('/api/designs', { data: { name: `Camera check ${view}` } })).json();
    await page.addInitScript((id) => localStorage.setItem('house-last-design', id), design.id);
    await page.goto('/');
    await expect(page.getByTestId('scene')).toHaveAttribute('data-ready', 'true');
    await page.getByRole('button', { name: view, exact: true }).click();
    await page.getByRole('button', { name: 'Rooms', exact: true }).click();
    await page.getByRole('button', { name: 'Zoom in', exact: true }).click();
    const canvas = (await page.locator('canvas').boundingBox())!;
    await page.mouse.move(canvas.x + canvas.width - 60, canvas.y + canvas.height / 2);
    await page.mouse.down({ button: view === '3D' ? 'right' : 'left' });
    await page.mouse.move(canvas.x + canvas.width - 150, canvas.y + canvas.height / 2 + 40, { steps: 5 });
    await page.mouse.up({ button: view === '3D' ? 'right' : 'left' });
    await page.waitForTimeout(1500);
    const before = await roomPositions(page);
    const expectSameCamera = async () => {
      await page.waitForTimeout(250);
      const after = await roomPositions(page);
      expect(after.map((room) => room.name)).toEqual(before.map((room) => room.name));
      for (const [index, room] of after.entries()) {
        expect(Math.abs(room.x - before[index].x)).toBeLessThan(2);
        expect(Math.abs(room.y - before[index].y)).toBeLessThan(2);
      }
    };
    await page.getByRole('button', { name: 'Select room Lounge', exact: true }).click();
    await expectSameCamera();
    await page.getByRole('button', { name: 'Floor colour #93a99b', exact: true }).click();
    await expect(page.getByTestId('save-status')).toHaveText('Saved');
    await expectSameCamera();
    await page.getByRole('button', { name: 'Close properties', exact: true }).click();
    await expectSameCamera();
    await page.getByRole('button', { name: 'Toggle furniture panel', exact: true }).click();
    await expectSameCamera();
    await page.getByRole('button', { name: 'Reset camera', exact: true }).click();
    await page.waitForTimeout(250);
    expect(await roomPositions(page)).not.toEqual(before);
  });
}
