type SpotifyTokenResponse = {
  access_token?: unknown;
  expires_in?: unknown;
  refresh_token?: unknown;
};

type SpotifyTokenInput = {
  clientId: string;
  clientSecret: string;
  code?: string;
  redirectUri?: string;
  refreshToken?: string;
};

export async function exchangeSpotifyToken(input: SpotifyTokenInput, fetcher: typeof fetch = fetch): Promise<{ accessToken: string; expiresIn: number; refreshToken: string }> {
  const body = new URLSearchParams();
  if (input.code && input.redirectUri) {
    body.set("grant_type", "authorization_code");
    body.set("code", input.code);
    body.set("redirect_uri", input.redirectUri);
  } else if (input.refreshToken) {
    body.set("grant_type", "refresh_token");
    body.set("refresh_token", input.refreshToken);
  } else {
    throw new Error("Spotify token request is invalid.");
  }

  const response = await fetcher("https://accounts.spotify.com/api/token", {
    body,
    headers: {
      authorization: `Basic ${Buffer.from(`${input.clientId}:${input.clientSecret}`).toString("base64")}`,
      "content-type": "application/x-www-form-urlencoded",
    },
    method: "POST",
  });
  const token: SpotifyTokenResponse = await response.json().catch(() => ({}));
  if (!response.ok || typeof token.access_token !== "string" || typeof token.expires_in !== "number") {
    throw new Error("Spotify token exchange failed.");
  }

  return {
    accessToken: token.access_token,
    expiresIn: token.expires_in,
    refreshToken: typeof token.refresh_token === "string" ? token.refresh_token : input.refreshToken ?? "",
  };
}
