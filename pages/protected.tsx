
import { withPageAuthRequired } from '@auth0/nextjs-auth0/client';

export default withPageAuthRequired(function Protected({ user }) {
    return <div>Hello {user.name}</div>;
});