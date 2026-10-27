// The real route files, for renderRouter in screen and navigation tests.
import AuthLayout from '@/app/(auth)/_layout';
import ForgotPassword from '@/app/(auth)/forgot-password';
import Login from '@/app/(auth)/login';
import Signup from '@/app/(auth)/signup';
import TabsLayout from '@/app/(tabs)/_layout';
import Applications from '@/app/(tabs)/applications';
import Home from '@/app/(tabs)/index';
import Profile from '@/app/(tabs)/profile';
import Search from '@/app/(tabs)/search';
import ApplicationDetails from '@/app/application/[id]';
import ApplyChooser from '@/app/apply/[jobId]/index';
import ApplyForm from '@/app/apply/[jobId]/form';
import ApplyUpload from '@/app/apply/[jobId]/upload';
import GovJobs from '@/app/gov-jobs';
import IntlJobs from '@/app/intl-jobs';
import JobDetails from '@/app/job/[id]';
import DeleteAccount from '@/app/delete-account';
import CvPreview from '@/app/cv-preview';
import Notifications from '@/app/notifications';
import ProfileBuilder from '@/app/profile-builder';
import SavedJobs from '@/app/saved-jobs';
import Settings from '@/app/settings';
import RootLayout from '@/app/_layout';

export const appRoutes = {
  _layout: RootLayout,
  '(auth)/_layout': AuthLayout,
  '(auth)/login': Login,
  '(auth)/signup': Signup,
  '(auth)/forgot-password': ForgotPassword,
  '(tabs)/_layout': TabsLayout,
  '(tabs)/index': Home,
  '(tabs)/search': Search,
  '(tabs)/applications': Applications,
  '(tabs)/profile': Profile,
  'application/[id]': ApplicationDetails,
  'apply/[jobId]/index': ApplyChooser,
  'apply/[jobId]/form': ApplyForm,
  'apply/[jobId]/upload': ApplyUpload,
  'job/[id]': JobDetails,
  'cv-preview': CvPreview,
  'delete-account': DeleteAccount,
  notifications: Notifications,
  'profile-builder': ProfileBuilder,
  'saved-jobs': SavedJobs,
  settings: Settings,
  'gov-jobs': GovJobs,
  'intl-jobs': IntlJobs,
};
