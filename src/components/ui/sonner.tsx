import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

function Toaster({ ...props }: ToasterProps) {
  return (
    <Sonner
      className="toaster group"
      style={{ zIndex: 99999 }}
      richColors
      duration={4000}
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-white group-[.toaster]:text-[hsl(20_10%_20%)] group-[.toaster]:border-[hsl(30_10%_90%)] group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-[hsl(20_5%_55%)]",
          actionButton:
            "group-[.toast]:bg-[hsl(18_65%_52%)] group-[.toast]:text-white",
          cancelButton:
            "group-[.toast]:bg-[hsl(30_10%_95%)] group-[.toast]:text-[hsl(20_10%_20%)]",
        },
      }}
      {...props}
    />
  );
}

export { Toaster, toast };
