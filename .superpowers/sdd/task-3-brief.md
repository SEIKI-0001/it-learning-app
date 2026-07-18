### Task 3: 全トピックの解説構成を共通UIへ流す

**Files:**
- Modify: `components/learn/TopicContent.tsx`
- Test: `test/ExplanationSlides.test.tsx`

**Interfaces:**
- Consumes: `Topic`, `getTopicExperience`, `ProcessDemoSection`, `VisualLearningSection`, `DiagramRenderer`。
- Produces: 専用体験・プロセスデモの有無に関係なく、体験（ある場合）・概念カード・試験ポイントを同じ `ExplanationSlides` に渡す `ExplanationSlide[]`。

- [ ] **Step 1: Write the failing content-assembly test**

  `TopicContent` のスライド配列生成を小さな純粋関数 `buildExplanationSlides(topic)` としてexportし、専用体験を持つトピックでも `experience`、`concept`、`exam-points` が順に含まれることをテストする。

  ```tsx
  it("keeps the common explanation slides after a topic experience", () => {
    const slides = buildExplanationSlides(topicWithExperience);

    expect(slides.map((slide) => slide.id)).toEqual([
      "experience",
      "concept",
      "exam-points",
    ]);
  });
  ```

- [ ] **Step 2: Run the focused test to verify RED**

  Run: `npm test -- --run test/TopicContent.test.tsx`

  Expected: FAIL because the helper does not exist and experience topics currently omit the shared concept and exam slides.

- [ ] **Step 3: Implement the minimal content assembly**

  `TopicContent.tsx` を以下の順に構成する。

  1. `getTopicExperience(topic.id)` があるときは `experience` を追加し、なければ `processDemo`、なければ `visualLearning` を最初の理解スライドとして追加する。
  2. すべてのトピックで既存の概念カードを `concept` スライドとして追加する。ただし最初の理解スライドが概念カードそのものの場合は重複させない。
  3. すべてのトピックで既存の解説本文・要点・図解を `exam-points` スライドとして追加する。要点と図解がなくても本文を表示する。
  4. `ExplanationSlides title="📖 解説"` に生成した配列を渡す。確認問題と `TopicReviewSections` は変更しない。

- [ ] **Step 4: Run focused tests to verify GREEN**

  Run: `npm test -- --run test/TopicContent.test.tsx test/ExplanationSlides.test.tsx test/EnterpriseActivitiesExperience.test.tsx`

  Expected: PASS. 専用体験の既存操作は失われず、共通の解説ナビゲーションも利用できる。

