import { CharityHeader } from '@/components/layout/CharityHeader';
import { CharityFooter } from '@/components/layout/CharityFooter';
import BackToTop from '@/components/common/BackToTop';

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <CharityHeader />
      <main>{children}</main>
      <CharityFooter />
      <BackToTop />
    </>
  );
}
