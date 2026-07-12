import { JSDOM } from "jsdom";
import { describe, expect, it } from "vitest";
import {
  collectInstagramProfilePage,
  collectInstagramReelPage,
  collectTikTokStudioPage,
  collectXProfilePage,
  collectYouTubeStudioContentPage,
  collectYouTubeStudioDashboardPage,
} from "../src/collection/collectors";

function installDom(html: string, url: string) {
  const dom = new JSDOM(html, { url });
  Object.defineProperty(globalThis, "document", { configurable: true, value: dom.window.document });
  Object.defineProperty(globalThis, "location", { configurable: true, value: dom.window.location });
  return dom;
}

describe("platform DOM collectors", () => {
  it("reads YouTube Studio channel analytics without OAuth", () => {
    installDom(
      `
        <a href="/channel/UC3et4G7xRpVJuZNEW4mHwhw">Studio</a>
        <div id="entity-name">Loorbit</div>
        <ytcd-channel-facts-item>
          <div class="metric-value-big">5</div>
          <div id="metric-0-value">1.5천</div>
          <div id="metric-1-value">4.1</div>
        </ytcd-channel-facts-item>
      `,
      "https://studio.youtube.com/channel/UC3et4G7xRpVJuZNEW4mHwhw",
    );

    const payload = collectYouTubeStudioDashboardPage();
    expect(payload.ok).toBe(true);
    expect(payload.profile).toMatchObject({
      accountName: "Loorbit",
      accountHandle: "UC3et4G7xRpVJuZNEW4mHwhw",
      followersText: "5",
      channelViewsText: "1.5천",
      watchHoursText: "4.1",
    });
  });

  it("reads YouTube Studio content rows and keeps unavailable likes empty", () => {
    installDom(
      `
        <table aria-label="Shorts 동영상 목록">
          <ytcp-video-row>
            <a id="video-title" title="1kg vs 1000kg" href="/video/DrFGgiJC-TU/edit">1kg vs 1000kg</a>
            <div id="visibility">공개</div>
            <div id="date-text">2026. 7. 11.</div>
            <div id="views">1.2천</div>
            <div id="comments">0</div>
            <div id="duration">0:22</div>
          </ytcp-video-row>
        </table>
      `,
      "https://studio.youtube.com/channel/UC3et4G7xRpVJuZNEW4mHwhw/videos/short",
    );

    const payload = collectYouTubeStudioContentPage("UC3et4G7xRpVJuZNEW4mHwhw", "short");
    expect(payload.ok).toBe(true);
    expect(payload.items[0]).toMatchObject({
      contentId: "DrFGgiJC-TU",
      contentType: "short",
      title: "1kg vs 1000kg",
      viewsText: "1.2천",
      likesText: null,
      commentsText: "0",
      publishedDisplay: "2026. 7. 11.",
    });
  });

  it("reads YouTube metrics from Studio table cell classes", () => {
    installDom(
      `
        <table aria-label="Shorts list">
          <ytcp-video-row>
            <a id="video-title" title="Real Studio row" href="/video/MetricRow1/edit">Real Studio row</a>
            <div class="tablecell-visibility"><div id="visibility">Public</div></div>
            <div class="tablecell-date"><div>2026. 7. 11.</div><span>Published</span></div>
            <div class="tablecell-views"><div class="metric-value">1.2K</div></div>
            <div class="tablecell-comments"><a class="comments-link">0</a></div>
            <div class="tablecell-likes">
              <div class="likes-container"><span>100.0%</span><span>7 likes</span></div>
            </div>
          </ytcp-video-row>
        </table>
      `,
      "https://studio.youtube.com/channel/UC3et4G7xRpVJuZNEW4mHwhw/videos/short",
    );

    const payload = collectYouTubeStudioContentPage("UC3et4G7xRpVJuZNEW4mHwhw", "short");
    expect(payload.items[0]).toMatchObject({
      contentId: "MetricRow1",
      publishedDisplay: "2026. 7. 11.Published",
      viewsText: "1.2K",
      likesText: "7",
      commentsText: "0",
      notes: ["visibility=Public"],
    });
  });

  it("reads TikTok Studio rows without confusing zero metrics with missing values", () => {
    installDom(
      `
        <div class="row">
          <div><span>00:22</span><a href="/@loorbit/video/752510565788">It Gets Mean</a><span>7월 11일</span></div>
          <div>
            <span data-tt="components_ItemRow_TUXText">1.2K</span>
            <span data-tt="components_ItemRow_TUXText">0</span>
            <span data-tt="components_ItemRow_TUXText">3</span>
          </div>
          <button data-tt="components_PrivacyCell">공개</button>
        </div>
      `,
      "https://www.tiktok.com/tiktokstudio/content",
    );

    const payload = collectTikTokStudioPage();
    expect(payload.ok).toBe(true);
    expect(payload.profile?.accountHandle).toBe("loorbit");
    expect(payload.items[0]).toMatchObject({
      contentId: "752510565788",
      title: "It Gets Mean",
      durationDisplay: "00:22",
      viewsText: "1.2K",
      likesText: "0",
      commentsText: "3",
    });
  });

  it("discovers Instagram reels from the signed-in profile", () => {
    installDom(
      `
        <meta property="og:title" content="Loorbit (@loorbit0) • Instagram photos and videos">
        <meta property="og:description" content="팔로워 12명, 팔로잉 3명, 게시물 4개 - Loorbit님의 Instagram 사진 및 동영상 보기">
        <a href="/loorbit0/reel/DaqFYYNyJBs/"><img alt="metal cube test"></a>
      `,
      "https://www.instagram.com/loorbit0/",
    );

    const payload = collectInstagramProfilePage("loorbit0");
    expect(payload.ok).toBe(true);
    expect(payload.profile).toMatchObject({
      accountHandle: "loorbit0",
      followersText: "12",
      followingText: "3",
      totalPostsText: "4",
    });
    expect(payload.items[0]).toMatchObject({
      contentId: "DaqFYYNyJBs",
      title: "metal cube test",
    });
  });

  it("reads Instagram Reel likes and explicit zero comments from page metadata", () => {
    installDom(
      `
        <meta property="og:url" content="https://www.instagram.com/reel/DaqFYYNyJBs/">
        <meta property="og:description" content='6 likes, 0 comments - loorbit0 - July 11, 2026: "It gets mean at 1000kg.".'>
      `,
      "https://www.instagram.com/reel/DaqFYYNyJBs/",
    );

    const item = collectInstagramReelPage("loorbit0", "DaqFYYNyJBs");
    expect(item).toMatchObject({
      likesText: "6",
      commentsText: "0",
      publishedDisplay: "July 11, 2026",
      title: "It gets mean at 1000kg.",
    });
  });

  it("reads X post views and reactions from accessible labels", () => {
    installDom(
      `
        <meta property="og:title" content="Loorbit (@loorbit0) / X">
        <main>
          <a href="/loorbit0/following">3 팔로우 중</a>
          <a href="/loorbit0/verified_followers">5 팔로워</a>
          <article>
            <a href="/loorbit0/status/1941122334455"><time datetime="2026-07-11T01:02:03.000Z">7월 11일</time></a>
            <a href="/loorbit0/status/1941122334455/analytics" aria-label="208 조회수"></a>
            <div data-testid="tweetText">It gets mean at 1000kg.</div>
            <button data-testid="reply" aria-label="0 답글"></button>
            <button data-testid="retweet" aria-label="1 재게시"></button>
            <button data-testid="like" aria-label="4 마음에 들어요"></button>
          </article>
        </main>
      `,
      "https://x.com/loorbit0",
    );

    const payload = collectXProfilePage("loorbit0");
    expect(payload.ok).toBe(true);
    expect(payload.items[0]).toMatchObject({
      viewsText: "208",
      likesText: "4",
      commentsText: "0",
      sharesText: "1",
      publishedAt: "2026-07-11T01:02:03.000Z",
    });
  });
});
