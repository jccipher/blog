# Daily AI Blog Digest — GitHub Actions 详细设计

状态：已实施（Implemented; production enablement depends on repository configuration）

适用仓库：`jccipher/blog`

时区：`Asia/Shanghai`

设计目标：即使个人电脑关机，也能由 GitHub 托管执行每日 AI 博客发现、双语写作、验证、提交、部署和验收。

## 1. 决策摘要

采用一个主工作流、六个隔离 Job：

```text
schedule / workflow_dispatch
            |
            v
   1. preflight-discover  ---- NOOP ----> summary
            |
            v
   2. generate-patch (OpenAI key)
            |
            v
   3. validate (fresh checkout, no secrets)
            |
       +----+-------------------+
       | shadow                 | publish
       v                        v
   preview artifact       4. publish-commit
                                |
                                v
                         5. deploy-pages
                                |
                                v
                         6. verify-public
                                |
                                v
                         notify / summary
```

核心安全边界：

- 读取互联网内容、调用模型、写入 Git、部署 Pages 分属不同 Job。
- `OPENAI_API_KEY` 只对 `generate-patch` 可见；持有该 Secret 的 Job 没有仓库写权限。
- `publish-commit` 有 `contents: write`，但拿不到 OpenAI Key，也不执行来自来源网页或模型生成的命令。
- 所有模型输出先变成补丁，再由全新 checkout 的确定性 Job 复验。
- 直接用工作流自带的 `GITHUB_TOKEN` 推送不会触发新的 GitHub Pages 构建，因此同一工作流必须显式构建并部署 Pages，不能依赖后续 `push` 工作流。
- 第一阶段仅运行 `shadow` 模式；通过 5–7 次连续验收后才开启无人值守发布。

实施说明：OpenAI Developer Blog 当前会对普通无浏览器 HTTP client 返回 `403`，因此已实施版本让受限的 Codex Job 使用 Web Search 完成官方 archive 遍历与来源核实，而 `preflight` 确定性地产生 processed set 和可信运行参数。模型仍没有 Git/Pages 写权限；其结果必须经过独立 patch、path allowlist、pair contract、完整站点构建和 hash 验证后，才可进入发布 Job。

## 2. 范围与非目标

### 2.1 本期范围

- 每天发现最新、尚未发布的 OpenAI Developer Blog 与 Claude/Anthropic 官方文章。
- 每个来源生成一组独立的英文/中文文章；一天最多处理每个 publisher 各一个来源，即最多两组、四个 Markdown 文件。
- 保持现有 `daily-ai-blog-digest` contract：来源去重、canonical URL、双语对应、`run_mode`、版权摘要规则、未来时间检查与渲染检查。
- 支持定时运行与手动运行。
- 产出机器可读状态、可审计 artifacts、Git commit、Pages deployment 和公网验收结果。
- 支持 shadow、人工审批发布和全自动发布三种运营阶段。

### 2.2 非目标

- 不把未经许可的来源全文复制进博客。
- 不允许任意 URL 作为定时任务输入。
- 不让模型直接持有 Git 写权限、Pages 权限或通知渠道权限。
- 不在本期引入 AWS/GCP、数据库、队列或自托管 Runner。
- 不自动回滚已经推送的内容；发布后的故障按“修复或人工 revert”处理。

## 3. 现状与必须保持的不变量

仓库当前事实：

- `_config.yml` 设置 `url: https://jccipher.github.io`、`baseurl: /blog`、`timezone: Asia/Shanghai`。
- `npm run check` 会生成并验证 `_site/blog`。
- `_site/blog` 是待上传到 GitHub Pages 的站点 artifact 根目录。
- 当前 `.github/workflows/blank.yml` 只是示例 CI，不承担博客自动化或 Pages 部署。
- `validate_digest.mjs` 已覆盖双语对应、单一来源、publisher/domain、一致 metadata、重复来源、发布时间和 permalink 等约束。

发布不变量：

1. 一个来源只对应一个英文/中文 pair。
2. 一个 pair 恰好一个 `sources` entry。
3. `preview` 不计入 processed set，也绝不能提交到生产。
4. `published` 与没有 `run_mode` 的历史文章计入 processed set。
5. 没有可信 reuse permission 时只能 `summary-only`。
6. 没有确认的官方中文版时，`official_zh_url` 必须为 `null`。
7. production 时间使用实际上海执行时间，不能使用未来时间或预设 cron 时间。
8. 发布前必须执行 pair validator 和完整 `npm run check`。
9. Git 只能显式 stage 本次 manifest 列出的 `_posts` 文件。
10. 推送前远端 `main` 必须仍等于本次发现阶段记录的 `base_sha`。

## 4. 仓库内组件设计

实施阶段建议新增以下文件；本设计阶段不创建这些执行文件：

```text
.github/
  workflows/
    daily-ai-blog.yml
  codex/
    prompts/
      daily-ai-blog-generate.md
  dependabot.yml                    # 若仓库尚未配置 Actions 更新

scripts/ai-blog/
  discover.mjs                      # 发现、canonicalize、processed-set、来源快照
  make-run-plan.mjs                 # 决定 shadow/publish、生成 run key
  validate-patch.mjs                # 路径白名单、pair 列表、manifest/hash
  verify-generated-pages.mjs        # 检查新文章渲染文件和双语链接
  verify-publication.mjs            # HTTP 公网验收，支持安全重试
  write-summary.mjs                 # 统一 $GITHUB_STEP_SUMMARY 输出

.github/schemas/
  ai-blog-candidates.schema.json
  ai-blog-result.schema.json

docs/
  daily-ai-blog-runbook.md           # 实施时补充操作手册
```

现有文件继续复用：

- `.agents/skills/daily-ai-blog-digest/SKILL.md`
- `.agents/skills/daily-ai-blog-digest/references/blog-contract.md`
- `.agents/skills/daily-ai-blog-digest/scripts/validate_digest.mjs`
- `scripts/preview-build.mjs`
- `scripts/verify-build.mjs`

所有脚本应做到：相同 checkout、相同输入得到相同结果；业务状态写入 JSON；正常 `NOOP` 返回 exit code `0`，真正错误返回非零。

## 5. 触发、并发与运行模式

### 5.1 触发方式

工作流支持：

- `schedule`：每天上海时间 `07:17`。避开整点高峰；GitHub schedule 是 best effort，可能延迟。
- `workflow_dispatch`：人工补跑、shadow 验证或受控发布。

设计片段：

```yaml
on:
  schedule:
    - cron: "17 7 * * *"
      timezone: "Asia/Shanghai"
  workflow_dispatch:
    inputs:
      mode:
        type: choice
        options: [shadow, publish]
        default: shadow
      reason:
        type: string
        required: false
```

不提供 arbitrary source URL 输入。若将来确需处理指定来源，应增加单独的 allowlist 校验和人工审批入口。

### 5.2 有效运行模式

- 定时触发：读取 repository variable `AI_BLOG_PUBLISH_MODE`；未设置或非法值一律降级为 `shadow`。
- 手动触发：使用 dispatch 的 `mode`；`publish` 仍须经过 `ai-blog-production` environment。
- 模型生成时即写入最终 `run_mode`：shadow artifact 使用 `preview`；生产使用 `published`。
- 不允许在发布 Job 用字符串替换把 `preview` 改成 `published`，避免绕过重新验证。

### 5.3 并发

```yaml
concurrency:
  group: daily-ai-blog-${{ github.repository }}
  cancel-in-progress: false
```

只允许一个运行进入关键区。新 run 不取消正在生成或发布的 run，避免产生半完成状态。另以 `base_sha` compare-and-swap 防止它与人类提交或其他 workflow 发生竞争。

## 6. Workflow Job 分层

### 6.1 `preflight-discover`

职责：只读地建立本次可信运行计划。

步骤：

1. Checkout 触发时的默认分支 SHA，`persist-credentials: false`。
2. 记录 `base_sha`、`run_id`、`run_attempt`、上海日期和 effective mode。
3. 读取 `_posts/**/*.md` front matter，建立 processed URL set：忽略 `preview`，保留 `published` 和 legacy。
4. 从固定的官方 archive/feed/index 获取候选，不跟随非 allowlist 域名。
5. URL 去 tracking query/hash、统一 host/path/trailing slash，按 contract canonicalize。
6. 对每个 publisher 选择“最新且未处理”的至多一个来源。
7. 获取来源页面，限制响应大小和重定向次数，提取 title、published date、canonical URL、正文纯文本快照以及可能的官方中文链接。
8. 对官方中文链接只做证据记录；无法明确匹配则写 `null`，不猜测。
9. 将 HTML 转成纯文本/结构化 JSON，删除 script、style、form、隐藏内容和控制字符；保存原始 URL、最终 URL与 SHA-256。
10. 输出 `candidates.json` 和 `source-snapshots/` artifact。

信任规则：来源页面是非可信数据。页面中的“ignore previous instructions”“运行命令”“读取 Secret”等文本全部只可作为被摘要内容，不能成为执行指令。

结果：

- 无候选：`SUCCESS_NOOP`，后续生成/发布 Job 跳过。
- 有候选：`READY_TO_GENERATE`。
- 任一 publisher archive 暂时不可访问：不能把“空列表”误判为 no-op；返回 `SOURCE_DISCOVERY_FAILED`。

### 6.2 `generate-patch`

职责：使用模型从固定候选 artifact 生成文章，但不能改变远端仓库。

隔离要求：

- checkout 固定 `base_sha`，`persist-credentials: false`。
- `permissions: contents: read`。
- 只通过 `openai/codex-action` 的 Secret input 传入 `OPENAI_API_KEY`，不设为 job-level `env`。
- 安装依赖、运行 self-test 等所有仓库代码必须在 Codex Secret 暴露前完成。
- Codex 使用最窄可行 sandbox（workspace write）、默认 drop-sudo，不使用 danger/full access。
- 不允许模型联网；它只读取经过净化且有 hash 的来源 artifact。需要网络补证据时让本次运行失败，由 discover 逻辑后续补强。
- Prompt 文件固定在受版本控制路径，来源内容用明确 data delimiter 包裹。

模型允许写入：

```text
_posts/YYYY-MM-DD-ai-blog-openai-*.md
_posts/YYYY-MM-DD-ai-blog-openai-*-zh.md
_posts/YYYY-MM-DD-ai-blog-anthropic-*.md
_posts/YYYY-MM-DD-ai-blog-anthropic-*-zh.md
```

任何其他工作区变化都会在下一 Job 拒绝。模型完成后，只允许受信任的内联 diff 打包与官方 artifact upload action；不再执行仓库脚本。

输出：

- `candidate.patch`
- `generation-manifest.json`
- model final output（供审计，不作为发布授权）

建议 artifact retention 为 14 天。上传/下载 artifact 自带 SHA-256 digest 校验，manifest 再记录每个目标文件的 SHA-256。

### 6.3 `validate`

职责：在无模型 Secret、无写权限的新环境里验证补丁。

步骤：

1. 全新 checkout `base_sha`，`persist-credentials: false`。
2. 下载候选与 patch artifact；校验 artifact digest 和 manifest 中的 hash。
3. `git apply --check` 后应用补丁。
4. 路径白名单：只允许 manifest 声明的 `_posts/*.md`；最多四个文件；禁止删除和 rename。
5. 对每个来源确认恰好生成 en/zh 两个文件。
6. 运行 validator self-test。
7. 对每个 pair 运行 `validate_digest.mjs EN ZH`。
8. 运行 lockfile 固定的 `npm ci` 和 `npm run check`。
9. 检查每篇新文章对应的 `_site/blog/posts/.../index.html` 与 `_site/blog/zh/posts/.../index.html`。
10. 检查页面无未渲染 Liquid、canonical/translation link 正确、source link 存在。
11. 生产模式额外断言所有新增文件 `run_mode: published`；shadow 模式额外断言全部为 `preview`。
12. 生成 `validated-content.tar`、`validated-site.tar` 与 `validated-manifest.json`。

从这一阶段开始，后续 Job 只能发布 validated artifact，不能重新调用模型或重新生成内容。

### 6.4 `publish-commit`

条件：`validate` 成功、effective mode 为 `publish`、`ai-blog-production` environment 放行。

权限：只有本 Job 获得 `contents: write`；没有 OpenAI Key。

步骤：

1. 新 checkout 默认分支最新状态。
2. 比较远端 `refs/heads/main` 与 validated manifest 的 `base_sha`。
3. 不相等则返回 `BASE_MOVED`，不尝试 rebase、merge 或覆盖；下一次运行重新发现和生成。
4. 解包 validated content，复核 hash 与 path allowlist。
5. 再运行 pair validator 和 `npm run check`，防止环境/解包漂移。
6. 只 `git add --` manifest 中精确列出的文章文件。
7. 断言 staged diff 没有其他路径，且不为空。
8. 以固定 bot identity 创建一个 commit，message 包含来源数量；commit trailer 记录 Actions run URL、base SHA 和 source URL hash。
9. 普通 fast-forward push `HEAD:main`，禁止 force push。
10. 输出 `published_commit_sha`。

幂等性：

- 发布前发现已存在相同 canonical URL 时，视为 `ALREADY_PUBLISHED`，不创建重复文件或编号后缀。
- Job 在 commit 后、push 前失败可安全重跑。
- push 成功后 Job 状态不明时，先按 source URL 和 run trailer 检查远端；已存在则复用现有 SHA，不再创建第二个 commit。

### 6.5 `deploy-pages`

这是必要 Job，不是可选优化。

原因：GitHub 文档明确说明，使用本 workflow 的 `GITHUB_TOKEN` 推送的 commit 不会触发新的 Pages build。设计因此不等待另一个 push-triggered Pages workflow，而是部署本次已经验证的 site artifact。

条件：`publish-commit` 成功，并且 artifact 中内容 hash 与 `published_commit_sha` 对应。

步骤：

1. 下载 `validated-site`。
2. 将 `_site/blog` 的内容作为 Pages artifact 根目录上传。
3. 使用 `actions/deploy-pages` 部署。
4. environment 固定为 `github-pages`，记录 deployment URL。

最低权限：

```yaml
permissions:
  contents: read
  pages: write
  id-token: write
```

迁移时必须在 Repository Settings → Pages 将 Source 改为 GitHub Actions。切换动作在 shadow 验证完成前不执行。

### 6.6 `verify-public`

职责：判定“Git 已提交”是否真正转化为“用户可访问”。

对 manifest 中每个新 URL：

- 验证 English 与 Chinese URL 最终返回 HTTP `200`。
- 验证页面包含预期 title、source canonical URL 和互译链接。
- 验证页面不包含 `{{`、`{%` 等未渲染 Liquid。
- 验证首页或归档页已经包含新文章链接。
- 使用有限指数退避，例如 20 秒、40 秒、80 秒、160 秒、300 秒，总等待不超过约 10 分钟。

若 Git push 已成功但部署或公网验证失败，状态必须明确为 `FAILED_POST_COMMIT`，并展示 commit SHA；绝不能把它报告成“未发布”并再次生成同一来源。

## 7. Secret、Variable 与 Environment

### 7.1 必需 Secret

| 名称 | 类型/位置 | 可见 Job | 用途 | 轮换 |
|---|---|---|---|---|
| `OPENAI_API_KEY` | 推荐放在 `ai-blog-generation` environment secret | `generate-patch` | 调用 Codex/Responses API | 泄露立即轮换；常规每 90 天 |

`GITHUB_TOKEN` 是 GitHub 每个 Job 自动签发的短期 token，不需要手工创建 Secret；它的能力由 Job 级 `permissions` 收缩。

### 7.2 Repository Variables

| 名称 | 推荐默认值 | 说明 |
|---|---:|---|
| `AI_BLOG_PUBLISH_MODE` | `shadow` | schedule 的运行模式；非法或空值按 shadow |
| `AI_BLOG_MAX_SOURCES` | `2` | 每次最多一个 OpenAI + 一个 Anthropic |
| `AI_BLOG_COMMIT_NAME` | `latentx-ai-blog-bot` | Git commit author |
| `AI_BLOG_COMMIT_EMAIL` | GitHub noreply bot address | Git commit email |
| `AI_BLOG_VERIFY_TIMEOUT_SECONDS` | `600` | 公网验收总时限 |

Variable 不是 Secret，不能放 API key、token、webhook URL 或凭据。

### 7.3 可选 Secret

| 名称 | 何时需要 | 原则 |
|---|---|---|
| `ALERT_WEBHOOK_URL` | 需要外部 Slack/Discord/Teams 告警时 | 只给独立 notify Job；日志必须 mask |
| GitHub App private key / app id | 分支保护不允许 `GITHUB_TOKEN` 推送时 | 优先短期 installation token；不要默认创建 PAT |

不推荐用长期 PAT 作为第一方案。若 branch rules 要求 PR 或特定 App bypass，应创建最小权限 GitHub App，而不是给整个 workflow 一个高权限 PAT。

### 7.4 Environments

| Environment | Job | 初期保护 | 稳态保护 |
|---|---|---|---|
| `ai-blog-generation` | `generate-patch` | 无人工审批；只存 OpenAI Key | 相同 |
| `ai-blog-production` | `publish-commit` | required reviewer，观察 3–5 次受控发布 | 连续稳定后可移除 reviewer，实现无人值守 |
| `github-pages` | `deploy-pages` | 仅允许默认分支/本 workflow | 相同 |

Environment Secret 在保护规则通过前不可用。生产 approval 只挡 `publish-commit`，不让 OpenAI Key 与写权限在同一审批边界内重合。

## 8. 权限矩阵

顶层设置 `permissions: {}`，每个 Job 单独声明所需权限；未列出的 scope 均为 `none`。

| Job | `contents` | `pages` | `id-token` | `issues` | OpenAI Key | 外网 | 可写远端 |
|---|---|---|---|---|---|---|---|
| `preflight-discover` | `read` | `none` | `none` | `none` | 否 | 仅官方 allowlist | 否 |
| `generate-patch` | `read` | `none` | `none` | `none` | 是 | 模型 API proxy；来源网络关闭 | 否 |
| `validate` | `read` | `none` | `none` | `none` | 否 | 仅依赖下载；可通过 cache 降低 | 否 |
| `publish-commit` | `write` | `none` | `none` | `none` | 否 | GitHub origin | 仅 fast-forward push |
| `deploy-pages` | `read` | `write` | `write` | `none` | 否 | GitHub Pages | 仅 Pages deployment |
| `verify-public` | `none` | `none` | `none` | `none` | 否 | `jccipher.github.io` | 否 |
| `notify`（可选） | `read` | `none` | `none` | `write` | 否 | GitHub/API 或 webhook | 仅 issue/comment |

`id-token: write` 只出现在 Pages deploy Job。若未来迁移 AWS/GCP，再给独立 cloud deploy Job OIDC，不能把它加到模型 Job。

## 9. Artifact 与 Job 接口

### 9.1 `candidates.json`

至少包含：

```json
{
  "schema_version": 1,
  "run_key": "2026-09-05",
  "base_sha": "<40-hex>",
  "mode": "shadow",
  "generated_at": "<ISO-8601>",
  "candidates": [
    {
      "publisher": "OpenAI",
      "canonical_url": "https://developers.openai.com/blog/...",
      "title": "Exact source title",
      "published_at": "YYYY-MM-DD",
      "official_zh_url": null,
      "snapshot_path": "source-snapshots/openai.txt",
      "snapshot_sha256": "<64-hex>"
    }
  ]
}
```

### 9.2 `validated-manifest.json`

至少包含：

- `base_sha`、`run_id`、`run_attempt`、effective mode。
- 每个 canonical source URL 及 hash。
- 精确新增路径、文件 SHA-256、slug、lang、run_mode。
- 预期 public URL 与 rendered artifact path。
- `npm ci`、pair validator、`npm run check` 的结果摘要。
- candidate artifact digest、patch artifact digest、site artifact digest。

Job 之间不使用隐式 workspace 继承；只接受 checkout + versioned artifact + manifest。

## 10. 状态机与失败模型

### 10.1 状态机

```text
START
  -> DISCOVERING
      -> SUCCESS_NOOP
      -> READY_TO_GENERATE
          -> GENERATED
              -> VALIDATED_SHADOW -> SUCCESS_PREVIEW
              -> VALIDATED_PUBLISH
                  -> BASE_RECHECK
                      -> COMMITTED
                          -> DEPLOYED
                              -> VERIFIED -> SUCCESS_PUBLISHED
```

任何 pre-commit error 进入 `FAILED_PRE_PUBLISH`；commit/push 之后的 error 进入 `FAILED_POST_COMMIT`。

### 10.2 失败状态表

| 状态 | 阶段 | 是否有远端变更 | 自动重试建议 | 处理 |
|---|---|---:|---|---|
| `SUCCESS_NOOP` | discover | 否 | 不需要 | 正常绿色；摘要列出已检查 archives |
| `SOURCE_DISCOVERY_FAILED` | discover | 否 | 仅 429/5xx/timeout，最多 2 次 | 失败告警；不能当 no-op |
| `SOURCE_METADATA_INVALID` | discover | 否 | 否 | 修 parser 或人工核实 |
| `OFFICIAL_ZH_AMBIGUOUS` | discover | 否 | 否 | 将 URL 置空可继续；若 policy 要求确认则失败 |
| `MODEL_AUTH_FAILED` | generate | 否 | 否 | 检查 Secret/额度/组织权限 |
| `GENERATION_FAILED` | generate | 否 | 限 1 次 | 保留来源 artifact 和模型输出 |
| `PATCH_SCOPE_VIOLATION` | validate | 否 | 否 | 高优先级安全失败；不得发布 |
| `PAIR_VALIDATION_FAILED` | validate | 否 | 否 | 修 prompt/validator 后重跑 |
| `SITE_BUILD_FAILED` | validate | 否 | 否 | 修模板、依赖或文章 markup |
| `ARTIFACT_INTEGRITY_FAILED` | validate/publish | 否 | 下载型错误可重试 1 次 | hash 不同立即终止 |
| `BASE_MOVED` | publish | 否 | 不在原 run 内重试 | 新 run 基于最新 main 重新生成 |
| `PUSH_REJECTED` | publish | 否或不确定 | 先查远端 | 禁止 force push |
| `COMMITTED` / `PUSHED_UNCONFIRMED` | publish | 可能有 | 先按 trailer/source 查重 | 禁止重复提交 |
| `PAGES_DEPLOY_FAILED` | deploy | 是 | 只重跑失败 Job | 不重新生成、不再次提交 |
| `PUBLIC_VERIFY_TIMEOUT` | verify | 是 | 延长验证或重跑 verify | 报告 commit 与 deployment URL |
| `SUCCESS_PREVIEW` | shadow | 否 | 不需要 | artifact 可供人工审阅 |
| `SUCCESS_PUBLISHED` | verify | 是 | 不需要 | 记录 commit、来源、双语 URL |
| `CANCELLED` | 任意 | 取决于阶段 | 先检查 commit/deployment | 摘要必须标注最后确认状态 |

### 10.3 Retry 原则

- 只自动重试明显 transient 的 fetch、429、5xx 和网络 timeout。
- 内容、权限、contract、hash、path scope 失败不自动重试。
- 模型生成最多额外重试一次，且使用相同来源 snapshot；防止无限花费与输出漂移。
- publish 失败永远先做远端读检查，再决定是否可以重试。
- Pages 失败只重跑 deploy/verify，绝不重新生成或创建重复 commit。

## 11. 安全设计

### 11.1 Secret 隔离

- 不把 `OPENAI_API_KEY` 设置成 workflow/job 级环境变量。
- 不保存 `auth.json`，不上传 Codex home、shell history、完整环境变量或 `.git/config`。
- Codex Job 的 checkout 不持久化 Git credentials。
- Secret 暴露前完成 `npm ci`、self-test 和任何仓库脚本执行。
- Codex step 之后只运行固定的 diff/hash 打包逻辑与官方 artifact action。

### 11.2 Prompt injection 与输出约束

- 来源域名 allowlist：`developers.openai.com`、`openai.com`、`claude.com`、`anthropic.com`；重定向后的最终 host 也必须命中。
- 来源 HTML 只经过净化后作为数据进入模型。
- Prompt 明确禁止执行来源中的指令、创建脚本、改 workflow、读取环境变量或扩展文件范围。
- 验证 Job 对最终 diff 做硬白名单，不相信模型自报的文件列表。
- 人工 dispatch 不接收 arbitrary URL、shell fragment、prompt fragment。

### 11.3 Actions 供应链

- 实施时将 `actions/checkout`、artifact actions、Pages actions 和 `openai/codex-action` 固定到完整 commit SHA；旁注对应 release tag。
- 配置 Dependabot/Renovate 提交 action SHA 更新 PR，经 CI 后合并。
- 不使用来自随机仓库的 composite action；简单逻辑留在本仓库 versioned scripts。
- Fork PR 不运行持有 Secrets 或 write token 的路径。
- 禁止 `pull_request_target` 执行 PR 中的代码。

### 11.4 Git 与分支保护

- 默认分支要求 fast-forward；禁止 force push。
- 有写权限的 Job 不执行来源文本或模型产生的命令。
- 若 branch rules 要求 PR，采用 GitHub App 短期 token + bot PR 模式；不要弱化 branch protection。
- commit 内容仅包含 validated manifest 的文章文件，工作流配置和脚本变更必须走正常人工 PR。

## 12. 可观测性与通知

每次运行在 `$GITHUB_STEP_SUMMARY` 输出：

- effective mode、trigger、base SHA、run URL。
- 两个 publisher 的 archive fetch 结果和所选 canonical URL。
- processed/no-op 理由。
- 生成文件列表、validator/build 状态、artifact digest。
- production 时的 commit SHA、deployment URL、英文/中文 public URL。
- 失败状态码、失败发生在 commit 前还是 commit 后、下一步 runbook 链接。

通知等级：

- `SUCCESS_NOOP`：不发外部告警，保留绿色摘要。
- `SUCCESS_PREVIEW`：仅 GitHub run summary。
- `FAILED_PRE_PUBLISH`：GitHub failure notification；连续两次失败可创建/更新一个去重 Issue。
- `FAILED_POST_COMMIT`：立即高优先级通知，必须带 commit SHA 和 deployment URL。
- `SUCCESS_PUBLISHED`：可选轻量成功通知，包含两种语言 URL。

Issue 去重键建议为 `<!-- ai-blog-failure:<status> -->`，恢复后自动追加 recovery comment 并关闭；不要每天创建新 Issue。

## 13. 迁移步骤

### Phase 0 — 基线与配置确认

1. 确认 GitHub Pages 当前 Source、branch protection、Actions 默认 token 权限和 environment 功能。
2. 记录当前本地自动化的 schedule、运行模式和最后一次成功来源 URL。
3. 保持本地任务继续生产发布；GitHub workflow 尚不定时发布。
4. 将示例 `blank.yml` 替换为真正 CI，或单独保留但升级/固定 actions；不要让示例成为发布依赖。

验收：现有网站与本地发布流程不受影响。

### Phase 1 — 抽取确定性脚本

1. 实现 `discover.mjs`、JSON schema、path/hash validator、generated-page verifier。
2. 给 canonicalization、processed set、preview ignore、domain allowlist、双 publisher 选择写 fixtures/unit tests。
3. 将日常 prompt 固定到仓库文件，引用现有 skill 与 blog contract。
4. 为 `validate_digest.mjs` 增加 workflow 需要的机器可读输出，保持现有 CLI 兼容。

验收：本地 fixtures 与现有文章全部通过；恶意 HTML fixture 不会成为指令或产生额外文件。

### Phase 2 — 手动 Shadow

1. 创建 workflow，但只开放 `workflow_dispatch(mode=shadow)`。
2. 配置 `ai-blog-generation` 与 `OPENAI_API_KEY`。
3. 连续运行至少 3 次：有两个来源、单个来源、无新来源。
4. 人工审阅 artifacts、source evidence、英文/中文质量和 token 成本。

验收：没有远端 Git/Pages mutation；失败状态能准确分类。

### Phase 3 — 定时 Shadow

1. 启用每天 `07:17 Asia/Shanghai` schedule。
2. `AI_BLOG_PUBLISH_MODE=shadow`。
3. 与当前本地生产流程并行观察 5–7 次；GitHub 只产 preview artifact，不能提交。
4. 比较两端的候选选择、canonical URL、官方中文判断、输出结构和运行时长。

验收：连续 5–7 次没有漏源、重复、路径越界或 contract/build 失败；no-op 可信。

### Phase 4 — 人工审批生产

1. 创建 `ai-blog-production` environment，并配置 required reviewer。
2. 把 repository variable 改为 `publish`，但每次仍需人工批准 publish Job。
3. 在 Repository Settings → Pages 把 Source 切换到 GitHub Actions。
4. 完成 3–5 次发布，逐次核对 commit、Pages deployment 与 public verification。
5. 此阶段本地任务停止生产写入，保留为手动回退工具，避免双写。

验收：Actions 生成的 `GITHUB_TOKEN` commit 虽不触发旧 Pages build，同 run 的 explicit Pages deploy 可稳定发布。

### Phase 5 — 无人值守

1. 移除 `ai-blog-production` required reviewer；保留 environment 和 branch restrictions。
2. 保持 `AI_BLOG_PUBLISH_MODE=publish`。
3. 停用本机定时任务；保留代码与手动 runbook。
4. 每周审阅成功/no-op 比例、失败原因、API 花费；每月抽查内容质量。

验收：个人电脑关闭 48 小时期间，至少一次定时运行完成并在公网通过验证。

### Phase 6 — 稳态优化

- 增加依赖/cache 以降低时延，但 cache 不能包含 Secrets 或生成文章。
- 根据实际故障率决定是否接入外部 heartbeat，检测 GitHub schedule 整天未触发的情况。
- 若 GitHub schedule 的 best-effort 特性不能满足严格 SLA，再把“触发器”替换为 AWS EventBridge Scheduler 或 Google Cloud Scheduler，工作流业务层保持不变。

## 14. 回退方案

### 14.1 发布前回退

- 将 `AI_BLOG_PUBLISH_MODE` 改为 `shadow`，立即阻止后续 commit/deploy。
- 必要时 disable workflow schedule；保留 manual dispatch 用于诊断。
- 不删除 artifacts 和日志，保留 14 天审计窗口。

### 14.2 发布后回退

- 内容错误：人工创建正常 revert/fix commit，经 CI 后重新显式部署 Pages。
- Pages 错误但 commit 正确：只重跑 deploy/verify，不 revert 内容。
- 工作流系统性错误：停用 schedule，恢复本地任务前先检查当天 canonical URL 是否已 published，防止重复。
- 绝不自动 force-push、reset 默认分支或删除失败 run 的提交。

## 15. 测试与验收矩阵

实施 PR 至少覆盖：

| 场景 | 预期 |
|---|---|
| 两个 publisher 都有新文章 | 生成四个文件，通过两组 pair validation |
| 只有一个 publisher 有新文章 | 只生成一组，不创建空占位 |
| 没有新文章 | `SUCCESS_NOOP`，无模型调用、无 commit |
| 已存在同 URL 的 `published` | 跳过 |
| 仅存在同 URL 的 `preview` | 仍可生成 production pair，但路径冲突必须显式修复/替换，不能编号复制 |
| 官方中文链接不明确 | `official_zh_url: null` |
| 来源 404/429/5xx | 分类为 discovery failure；有限重试，不当 no-op |
| 来源正文含 prompt injection | 只作文本数据；diff 仍限文章路径 |
| 模型修改 workflow/script | `PATCH_SCOPE_VIOLATION` |
| 英中 source metadata 不同 | `PAIR_VALIDATION_FAILED` |
| 文章时间在未来 | production validation 失败 |
| 远端 main 在生成后前进 | `BASE_MOVED`，无 push |
| 手动与 schedule 重叠 | concurrency 串行；旧 run 不被取消 |
| push 成功、deploy 失败 | `FAILED_POST_COMMIT`，只重跑 deploy |
| Pages 延迟 5 分钟 | verify 重试后成功 |
| OpenAI Key 无效 | `MODEL_AUTH_FAILED`，仓库无变更 |
| artifact hash 不符 | `ARTIFACT_INTEGRITY_FAILED`，禁止发布 |
| workflow 从 fork PR 触发 | 无 Secret、无 write path |

生产放行标准：

- 所有安全边界测试通过。
- 5–7 次 scheduled shadow 连续通过。
- 3–5 次 reviewer-approved production 连续通过。
- 至少模拟一次 `BASE_MOVED`、一次 deploy failure 和一次 post-commit verify retry。
- 公网英文/中文 URL、首页/归档索引全部纳入自动验收。

## 16. 实施顺序与 PR 拆分

为降低一次性变更风险，建议拆为四个 PR：

1. **PR 1 — Deterministic core**：发现、schema、manifest、验证器、fixtures 和 unit tests。
2. **PR 2 — Shadow workflow**：手动触发、Codex Action、artifacts、summary；没有写权限。
3. **PR 3 — Scheduled shadow + observability**：定时、concurrency、状态分类、去重通知。
4. **PR 4 — Publish and Pages**：production environment、commit CAS、Pages artifact/deploy、public verify；合并后仍先要求 reviewer。

每个 PR 都应固定第三方 action SHA，并让现有 `npm run check` 继续作为必过 gate。

## 17. 已知限制与后续决策

- GitHub `schedule` 是 best effort，不是严格 SLA。若必须保证每天固定时间完成，需要外部 heartbeat 或云调度器补偿。
- Pages Source 从 branch 改为 GitHub Actions 是一次仓库设置变更，必须在 Phase 4 明确执行并记录回退方式。
- 如果 branch rules 禁止 bot 直接写 `main`，实施应切换为 GitHub App + PR 合并模型；本设计不建议为自动化降低保护规则。
- 模型质量不是确定性的，因此即使技术 gate 全绿，也要在 shadow/人工审批阶段完成足够内容抽查。
- `npm run check` 当前是自定义静态构建而非标准 GitHub Jekyll action；部署必须上传 `_site/blog`，不能上传仓库根目录。

## 18. 官方依据

- OpenAI Codex GitHub Action：支持在 CI 中执行 `codex exec`、通过 API key proxy 隔离凭据，并建议选择最窄 sandbox、限制触发器与净化非可信输入：<https://learn.chatgpt.com/docs/github-action>
- OpenAI Non-interactive mode：自动化默认用 API key；不要把 key 暴露为会被仓库代码读取的 job-level environment；GitHub Actions 优先使用 Codex Action：<https://learn.chatgpt.com/docs/non-interactive-mode>
- GitHub `GITHUB_TOKEN`：workflow 用该 token 推送不会触发新的 workflow，且不会触发 Pages build：<https://docs.github.com/en/actions/concepts/security/github_token>
- GitHub Actions permissions：Job 可逐 scope 设置 `read`/`write`/`none`，一旦声明部分 scope，未声明项为 `none`：<https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax>
- GitHub Pages custom workflow：`deploy-pages` 最低需要 `pages: write` 与 `id-token: write`，并使用 `github-pages` environment：<https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages>
- GitHub Pages publishing source：可从 branch 模式切换为 GitHub Actions；`GITHUB_TOKEN` 推送不会触发 branch Pages build：<https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site>
- GitHub Actions artifacts：upload action 生成 SHA-256 digest，download 时自动验证，可设置 retention：<https://docs.github.com/en/actions/tutorials/store-and-share-data>
- GitHub Actions Secrets：Secret 需要显式传入 Job/step，并应采用最小权限；需要额外 GitHub 权限时优先 GitHub App 而非 PAT：<https://docs.github.com/en/actions/concepts/security/secrets>
- GitHub OIDC：未来连接云服务时可使用短期 OIDC 凭据而非长期 cloud secret：<https://docs.github.com/en/actions/how-tos/secure-your-work/security-harden-deployments/oidc-in-cloud-providers>
