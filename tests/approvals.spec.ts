import { test, expect, Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { LeadStatus } from '../types';

test.use({ timezoneId: 'Asia/Tokyo', locale: 'ja-JP' });

const APP_URL = process.env.APP_URL || 'http://localhost:3000'; // Fallback for local testing

// Helper function to dismiss toasts
async function dismissAllToasts(page: Page) {
  await page.locator('[role="status"]').evaluateAll(elements =>
    elements.forEach(el => el.remove())
  );
}

// Helper function to focus on the first invalid field (if any) after form submission attempt
async function expectAndFocusError(page: Page, errorMessage: string) {
  const errorElement = page.locator('p[role="alert"]', { hasText: errorMessage });
  await expect(errorElement).toBeVisible();

  // For Playwright, checking focus needs the element to actually receive focus,
  // which might not happen automatically after a generic click + validation.
  // The app's validation logic includes `element.focus()`, so we can test that.
  // This will be checked by the form-specific assertions.
}

test.describe('Approval Workflow E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(APP_URL);
    // Assuming a default user is logged in or can be selected
    // If auth is required, add login steps here. For now, assume public access or auto-login for testing.
    await page.waitForLoadState('domcontentloaded');
    await page.getByRole('button', { name: '閉じる' }).click().catch(() => {}); // Close setup modal if present
    await page.getByRole('button', { name: 'バグ報告・改善要望' }).click().catch(() => {}); // Close bug report modal if present
    await dismissAllToasts(page); // Clear any initial toasts
  });

  test('休暇申請: 必須入力→バリデーション→下書き保存→提出→承認一覧に反映', async ({ page }) => {
    await page.getByRole('link', { name: '休暇申請' }).click();
    await expect(page.getByRole('heading', { name: '休暇申請フォーム' })).toBeVisible();

    // 初期状態で送信ボタンが非活性であることを確認
    const submitButton = page.getByRole('button', { name: '申請を送信する' });
    await expect(submitButton).toBeDisabled();

    // 承認ルートを選択
    await page.locator('#approval-route-selector').selectOption({ label: '社長決裁ルート' });
    // まだ他の必須項目が未入力なので、送信ボタンは非活性のまま
    await expect(submitButton).toBeDisabled();

    // 必須項目を入力
    await page.getByLabel('休暇の種類 *').selectOption('有給休暇');
    await page.getByLabel('開始日 *').fill('2025-10-26');
    await page.getByLabel('終了日 *').fill('2025-10-26');
    await page.getByLabel('理由 *').fill('私用のため');

    // 全ての必須項目が入力されたので、送信ボタンが活性化されることを確認
    await expect(submitButton).toBeEnabled();

    // 下書き保存（機能がモックのため成功トーストのみ確認）
    await page.getByRole('button', { name: '下書き保存' }).click();
    await expect(page.locator('[role="status"]', { hasText: '下書き保存' })).toBeVisible();
    await dismissAllToasts(page);

    // 提出
    await submitButton.click();
    await expect(submitButton).toBeDisabled(); // 送信中は非活性
    await expect(page.locator('[role="status"]', { hasText: '申請が提出されました。承認一覧で確認できます。' })).toBeVisible();
    await dismissAllToasts(page);

    // 承認一覧に反映されていることを確認
    await page.getByRole('link', { name: '承認一覧' }).click();
    await expect(page.getByRole('heading', { name: '要承認' })).toBeVisible();

    // 「自分の申請」タブに切り替え
    await page.getByRole('tab', { name: '自分の申請' }).click();
    await expect(page.getByRole('heading', { name: '自分の申請' })).toBeVisible();
    await expect(page.getByRole('gridcell', { name: '休暇申請' })).toBeVisible();
    await expect(page.getByRole('gridcell', { name: '承認待ち' })).toBeVisible();
  });

  test('休暇申請: 終了日 < 開始日 のエラーパス', async ({ page }) => {
    await page.getByRole('link', { name: '休暇申請' }).click();
    await expect(page.getByRole('heading', { name: '休暇申請フォーム' })).toBeVisible();

    const submitButton = page.getByRole('button', { name: '申請を送信する' });
    await expect(submitButton).toBeDisabled();

    // 承認ルートを選択
    await page.locator('#approval-route-selector').selectOption({ label: '社長決裁ルート' });

    await page.getByLabel('休暇の種類 *').selectOption('有給休暇');
    await page.getByLabel('開始日 *').fill('2025-10-26');
    await page.getByLabel('終了日 *').fill('2025-10-25'); // 終了日を過去に設定
    await page.getByLabel('理由 *').fill('テスト');

    // 終了日 < 開始日 のため、送信ボタンは非活性
    await expect(submitButton).toBeDisabled();
    // 送信を試み、エラーが表示され、フォーカスが移動することを確認
    await submitButton.click(); // 無効なボタンをクリックしてもイベントは発火するが、バリデーションが先に走る想定
    await expectAndFocusError(page, '終了日は開始日以降の日付を選択してください。');
    await expect(page.locator('#endDate')).toBeFocused();
  });

  test('交通費申請: 1件登録→金額自動計算や合計、通貨フォーマット確認→提出', async ({ page }) => {
    await page.getByRole('link', { name: '交通費申請' }).click();
    await expect(page.getByRole('heading', { name: '交通費申請フォーム' })).toBeVisible();

    const submitButton = page.getByRole('button', { name: '申請を送信する' });
    await expect(submitButton).toBeDisabled();

    // 承認ルートを選択
    await page.locator('#approval-route-selector').selectOption({ label: '社長決裁ルート' });
    await expect(submitButton).toBeDisabled(); // 明細がまだなので非活性

    // 明細行を入力
    const firstRow = page.locator('tbody tr').first();
    await firstRow.getByLabel('利用日').fill('2025-11-01');
    await firstRow.getByLabel('出発地').fill('品川');
    await firstRow.getByLabel('目的地').fill('渋谷');
    await firstRow.getByLabel('交通手段').selectOption('電車');
    await firstRow.getByLabel('金額').fill('200');

    // 全ての必須項目が入力されたので、送信ボタンが活性化されることを確認
    await expect(submitButton).toBeEnabled();

    // 合計金額の表示確認
    await expect(page.getByText('合計金額: ¥200')).toBeVisible();

    // 別の行を追加して合計が更新されることを確認
    await page.getByRole('button', { name: '明細行を追加' }).click();
    const secondRow = page.locator('tbody tr').nth(1);
    await secondRow.getByLabel('利用日').fill('2025-11-02');
    await secondRow.getByLabel('出発地').fill('新宿');
    await secondRow.getByLabel('目的地').fill('東京');
    await secondRow.getByLabel('交通手段').selectOption('電車');
    await secondRow.getByLabel('金額').fill('150');

    await expect(page.getByText('合計金額: ¥350')).toBeVisible();

    // 提出
    await submitButton.click();
    await expect(submitButton).toBeDisabled(); // 送信中は非活性
    await expect(page.locator('[role="status"]', { hasText: '申請が提出されました。承認一覧で確認できます。' })).toBeVisible();
    await dismissAllToasts(page);
  });

  test('交通費申請: 負の金額/ゼロ金額のエラーパス', async ({ page }) => {
    await page.getByRole('link', { name: '交通費申請' }).click();
    await expect(page.getByRole('heading', { name: '交通費申請フォーム' })).toBeVisible();

    const submitButton = page.getByRole('button', { name: '申請を送信する' });

    await page.locator('#approval-route-selector').selectOption({ label: '社長決裁ルート' });

    const firstRow = page.locator('tbody tr').first();
    await firstRow.getByLabel('利用日').fill('2025-11-01');
    await firstRow.getByLabel('出発地').fill('品川');
    await firstRow.getByLabel('目的地').fill('渋谷');
    await firstRow.getByLabel('交通手段').selectOption('電車');
    await firstRow.getByLabel('金額').fill('-100'); // 負の金額

    // 金額が不正なため、送信ボタンは非活性
    await expect(submitButton).toBeDisabled();
    // 送信を試み、エラーが表示され、フォーカスが移動することを確認
    await submitButton.click();
    await expectAndFocusError(page, '全ての明細で金額を正しく入力してください。');
    await expect(firstRow.getByLabel('金額')).toBeFocused();

    await firstRow.getByLabel('金額').fill('0'); // ゼロ金額
    await expect(submitButton).toBeDisabled(); // 金額が不正なため、送信ボタンは非活性
    await submitButton.click();
    await expectAndFocusError(page, '全ての明細で金額を正しく入力してください。');
    await expect(firstRow.getByLabel('金額')).toBeFocused();
  });

  test('経費精算: 費目選択→金額/税計算（小数丸め・桁区切り）→領収書添付→提出', async ({ page }) => {
    await page.getByRole('link', { name: '経費精算' }).click();
    await expect(page.getByRole('heading', { name: '経費精算フォーム' })).toBeVisible();

    const submitButton = page.getByRole('button', { name: '申請を送信する' });
    await expect(submitButton).toBeDisabled();

    // 承認ルートを選択
    await page.locator('#approval-route-selector').selectOption({ label: '社長決裁ルート' });
    await expect(submitButton).toBeDisabled(); // 部門と明細がまだなので非活性

    // 部門を選択 (マスターデータが空の場合を考慮)
    await page.locator('#departmentId').selectOption({ index: 1 }).catch(() => {}); // Select first available department if any
    await expect(submitButton).toBeDisabled(); // 明細がまだなので非活性
    
    // 明細行を入力
    const firstRow = page.locator('.grid.grid-cols-1.md\\:grid-cols-12').first();
    await firstRow.getByLabel('支払日').fill('2025-11-05');
    await firstRow.locator('#paymentRecipientId').selectOption({ index: 1 }).catch(() => {}); // Select first available recipient
    await firstRow.getByLabel('内容').fill('会議費用');
    await firstRow.locator('#accountItemId').selectOption({ index: 1 }).catch(() => {}); // Select first available account item
    await firstRow.locator('#allocationDivisionId').selectOption({ index: 1 }).catch(() => {}); // Select first available allocation division
    await firstRow.getByLabel('金額').fill('1500');

    // 全ての必須項目が入力されたので、送信ボタンが活性化されることを確認
    await expect(submitButton).toBeEnabled();

    // 合計金額の表示確認
    await expect(page.getByText('合計金額: ¥1,500')).toBeVisible();

    // 提出
    await submitButton.click();
    await expect(submitButton).toBeDisabled(); // 送信中は非活性
    await expect(page.locator('[role="status"]', { hasText: '申請が提出されました。承認一覧で確認できます。' })).toBeVisible();
    await dismissAllToasts(page);
  });

  test('経費精算: 未入力項目がある場合のエラーパス', async ({ page }) => {
    await page.getByRole('link', { name: '経費精算' }).click();
    await expect(page.getByRole('heading', { name: '経費精算フォーム' })).toBeVisible();

    const submitButton = page.getByRole('button', { name: '申請を送信する' });

    await page.locator('#approval-route-selector').selectOption({ label: '社長決裁ルート' });
    await page.locator('#departmentId').selectOption({ index: 1 }).catch(() => {}); // Select first available department if any

    // 必須項目の一部を意図的に空にする
    const firstRow = page.locator('.grid.grid-cols-1.md\\:grid-cols-12').first();
    await firstRow.getByLabel('支払日').fill('2025-11-05');
    // await firstRow.locator('#paymentRecipientId').selectOption({ index: 1 }); // 支払先を空にする
    await firstRow.getByLabel('内容').fill('会議費用');
    await firstRow.locator('#accountItemId').selectOption({ index: 1 }).catch(() => {});
    await firstRow.locator('#allocationDivisionId').selectOption({ index: 1 }).catch(() => {});
    await firstRow.getByLabel('金額').fill('1500');

    // 支払先が未選択なので非活性
    await expect(submitButton).toBeDisabled();
    // 送信を試み、エラーが表示され、フォーカスが移動することを確認
    await submitButton.click();
    await expectAndFocusError(page, '全ての明細で支払先を選択してください。');
    await expect(firstRow.locator('#paymentRecipientId')).toBeFocused();
  });

  test('承認一覧: タブ切替（未承認/自分の申請/完了等）、検索・並び替え・ページング確認', async ({ page }) => {
    await page.getByRole('link', { name: '承認一覧' }).click();
    await expect(page.getByRole('heading', { name: '要承認' })).toBeVisible();

    // 「自分の申請」タブに切り替え、表示されることを確認
    await page.getByRole('tab', { name: '自分の申請' }).click();
    await expect(page.getByRole('heading', { name: '自分の申請' })).toBeVisible();
    
    // 「完了済」タブに切り替え、表示されることを確認
    await page.getByRole('tab', { name: '完了済' }).click();
    await expect(page.getByRole('heading', { name: '完了済' })).toBeVisible();

    // 検索機能の確認 (例: 申請種別で検索)
    await page.getByPlaceholder('承認一覧を検索...').fill('休暇');
    await expect(page.getByRole('gridcell', { name: '休暇申請' })).toBeVisible();
    await expect(page.getByRole('gridcell', { name: '経費精算' })).not.toBeVisible();
    await page.getByPlaceholder('承認一覧を検索...').clear();

    // 並び替え機能の確認 (例: 最終更新日時でソート)
    await page.getByRole('button', { name: '更新日時' }).click(); // 昇順
    await expect(page.locator('th button', { hasText: '更新日時' })).toHaveAttribute('aria-sort', 'ascending');
    await page.getByRole('button', { name: '更新日時' }).click(); // 降順
    await expect(page.locator('th button', { hasText: '更新日時' })).toHaveAttribute('aria-sort', 'descending');
  });

  test('アクセシビリティ監査 (休暇申請)', async ({ page }) => {
    await page.getByRole('link', { name: '休暇申請' }).click();
    await expect(page.getByRole('heading', { name: '休暇申請フォーム' })).toBeVisible();
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });

  test('アクセシビリティ監査 (交通費申請)', async ({ page }) => {
    await page.getByRole('link', { name: '交通費申請' }).click();
    await expect(page.getByRole('heading', { name: '交通費申請フォーム' })).toBeVisible();
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });

  test('アクセシビリティ監査 (経費精算)', async ({ page }) => {
    await page.getByRole('link', { name: '経費精算' }).click();
    await expect(page.getByRole('heading', { name: '経費精算フォーム' })).toBeVisible();
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });
  
  test('アクセシビリティ監査 (日報)', async ({ page }) => {
    await page.getByRole('link', { name: '日報' }).click();
    await expect(page.getByRole('heading', { name: '日報作成' })).toBeVisible();
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });

  test('アクセシビリティ監査 (週報)', async ({ page }) => {
    await page.getByRole('link', { name: '週報' }).click();
    await expect(page.getByRole('heading', { name: '週報作成' })).toBeVisible();
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });

  test('アクセシビリティ監査 (承認一覧)', async ({ page }) => {
    await page.getByRole('link', { name: '承認一覧' }).click();
    await expect(page.getByRole('heading', { name: '要承認' })).toBeVisible();
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });
});