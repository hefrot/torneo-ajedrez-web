import {LichessClient} from './providers/lichess.js';
import {ChessComClient} from './providers/chesscom.js';

export class AccountNotFoundError extends Error {
  constructor(platform, username) {
    super(`No se encontró @${username} en ${platform === 'lichess' ? 'Lichess' : 'Chess.com'}`);
    this.code = 'ACCOUNT_NOT_FOUND';
    this.platform = platform;
    this.username = username;
  }
}

export class AccountVerificationUnavailableError extends Error {
  constructor(platform, cause) {
    super(`No pudimos verificar ${platform === 'lichess' ? 'Lichess' : 'Chess.com'} en este momento`);
    this.code = 'ACCOUNT_VERIFICATION_UNAVAILABLE';
    this.platform = platform;
    this.cause = cause;
  }
}

export async function verifyPlatformAccount(
  platform,
  username,
  {
    lichessClient = new LichessClient(),
    chessComClient = null,
    now = new Date(),
  } = {},
) {
  const requested = String(username || '').trim();
  if (!requested || !['lichess','chesscom'].includes(platform)) {
    throw new TypeError('platform and username are required');
  }

  try {
    if (platform === 'lichess') {
      const profile = await lichessClient.getUser(requested);
      if (!profile || profile.disabled === true) throw new AccountNotFoundError(platform, requested);
      return {
        verified: true,
        platform,
        username: profile.username || profile.id || requested,
        usernameNormalized: String(profile.id || profile.username || requested).toLowerCase(),
        verificationSource: 'lichess_public_api',
        verifiedAt: now.toISOString(),
      };
    }

    const client = chessComClient || new ChessComClient();
    const profile = await client.getProfile(requested);
    if (!profile?.username) throw new AccountNotFoundError(platform, requested);
    return {
      verified: true,
      platform,
      username: profile.username,
      usernameNormalized: String(profile.username).toLowerCase(),
      verificationSource: 'chesscom_public_api',
      verifiedAt: now.toISOString(),
    };
  } catch (error) {
    if (error instanceof AccountNotFoundError) throw error;
    if (error?.status === 404) throw new AccountNotFoundError(platform, requested);
    throw new AccountVerificationUnavailableError(platform, error);
  }
}
