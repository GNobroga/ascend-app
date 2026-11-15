import { Button } from '@packages/ui/components/button';
import { safeRedirectPath } from '@/shared/lib/redirect-path';
import { GOOGLE_SIGN_IN_URL } from '../api/auth.api';
import { GoogleIcon } from './google-icon';

type GoogleSignInButtonProps = {
  redirectTo: string | null;
};

const googleSignInUrl = (redirectTo: string | null) => {
  const path = safeRedirectPath(redirectTo, '');
  return path ? `${GOOGLE_SIGN_IN_URL}?${new URLSearchParams({ redirectTo: path })}` : GOOGLE_SIGN_IN_URL;
};

export function GoogleSignInButton({ redirectTo }: GoogleSignInButtonProps) {
  return (
    <Button
      type="button"
      variant="secondary"
      size="lg"
      onClick={() => window.location.assign(googleSignInUrl(redirectTo))}
    >
      <GoogleIcon />
      Continuar com Google
    </Button>
  );
}
