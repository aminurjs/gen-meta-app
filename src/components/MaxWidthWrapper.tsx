import { cn } from "@/lib/utils";
import { ReactNode } from "react";

const MaxWidthWrapper = ({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) => {
  return (
    <div className={cn("mx-auto max-w-screen-xl px-4 md:px-10", className)}>
      {children}
    </div>
  );
};
export default MaxWidthWrapper;
