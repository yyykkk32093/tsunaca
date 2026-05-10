# プラン変更とコミュニティグレード連動のビジネスルール

> **最終更新**: 2026-04-19

## 概要

ユーザーの個人プラン（`User.plan`）とコミュニティグレード（`Community.grade`）は連動する。
オーナーのプラン変更は、そのオーナーが所有する全コミュニティのグレードに影響を与える。

---

## プラン ↔ コミュニティグレード対応表

| UserPlan | isPremiumPlan() | CommunityGrade |
| -------- | --------------- | -------------- |
| FREE     | false           | FREE           |
| LITE     | false           | FREE           |
| PRO      | true            | PREMIUM        |
| LIFETIME | true            | PREMIUM        |

判定ロジック: `CommunityGradePolicy.gradeFromPlan(plan)`

---

## グレードが設定・変更されるタイミング

| トリガー                         | 処理                                                               | 対象                                  |
| -------------------------------- | ------------------------------------------------------------------ | ------------------------------------- |
| コミュニティ作成                 | `CommunityGradePolicy.gradeFromPlan(owner.plan)` で初期 grade 設定 | 新規コミュニティ                      |
| OWNER 委譲                       | 新 OWNER の plan に基づいて `community.changeGrade(newGrade)`      | 委譲先コミュニティ                    |
| **プラン変更（ダウングレード）** | PREMIUM → FREE にグレード変更                                      | **オーナーの全 PREMIUM コミュニティ** |
| **プラン変更（アップグレード）** | FREE → PREMIUM にグレード変更                                      | **オーナーの全 FREE コミュニティ**    |

---

## プラン変更ルール（PlanChangePolicy）

| 変更パターン  | 許可 | コミュニティへの影響          |
| ------------- | ---- | ----------------------------- |
| FREE → LITE   | ✅    | なし（どちらも grade=FREE）   |
| FREE → PRO    | ✅    | FREE → PREMIUM に昇格         |
| LITE → PRO    | ✅    | FREE → PREMIUM に昇格         |
| PRO → LITE    | ✅    | PREMIUM → FREE に降格         |
| PRO → FREE    | ✅    | PREMIUM → FREE に降格         |
| LITE → FREE   | ✅    | なし（どちらも grade=FREE）   |
| LIFETIME → 他 | ❌    | 降格不可（LIFETIME は最上位） |

---

## 降格時の影響

PREMIUM → FREE への降格時、以下の機能が制限される:

- **Stripe Connect**: PREMIUM グレード × OWNER のみ利用可 → FREE では非活性化
- **コミュニティ無制限作成**: PRO 特権が失われる
- **高度な通知設定・カスタムスタンプ**: PRO 機能として制限

※ 既存の参加者・チャットデータは削除されない。新規のPREMIUM機能利用のみ制限。

---

## 処理フロー

```
RevenueCat Webhook (CANCELLATION / EXPIRATION / PRODUCT_CHANGE)
  ↓
HandleRevenueCatWebhookUseCase.execute()
  ↓
1. billingService.parseWebhookEvent(payload) → SubscriptionInfo
2. user.changePlan(newPlan)
3. userRepo.save(user)
4. ★ newPlan の isPremiumPlan() で新 grade を判定
5. ★ communityRepo.findsByCreatedBy(userId) でオーナーコミュニティ取得
6. ★ grade が変わるコミュニティに対して community.changeGrade(newGrade)
7. ★ communityRepo.save(community)
```

※ ★ は今回追加する処理

---

## キャンセル（FREE への変更）API フロー

```
フロント: POST /v1/billing/cancel（認証必須）
  ↓
CancelSubscriptionUseCase.execute(userId)
  ↓
1. billingService.getSubscriptionInfo(userId) で現サブスク確認
2. FREE → 早期リターン（既に FREE）
3. LIFETIME → 拒否（降格不可）
4. RevenueCat API で Stripe subscription_id を特定
5. Stripe API で subscription をキャンセル
6. RevenueCat が CANCELLATION Webhook を送信
7. HandleRevenueCatWebhookUseCase が plan=FREE + grade 連動を実行
```

---

## 関連ドメインオブジェクト

| クラス                 | パス                                          | 役割                                        |
| ---------------------- | --------------------------------------------- | ------------------------------------------- |
| `CommunityGradePolicy` | `domains/community/domain/service/`           | plan → grade 変換                           |
| `PlanChangePolicy`     | `domains/billing/domain/model/valueObject/`   | 変更許可判定 + 影響数計算                   |
| `CommunityGrade`       | `domains/community/domain/model/valueObject/` | FREE / PREMIUM の ValueObject               |
| `UserPlan`             | `domains/user/domain/model/valueObject/`      | FREE / LITE / PRO / LIFETIME の ValueObject |
