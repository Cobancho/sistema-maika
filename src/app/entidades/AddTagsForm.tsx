"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState, type FC } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "~/app/components/ui/alert-dialog";
import { capitalizeFirstLetter } from "~/lib/functions";
import { api } from "~/trpc/react";
import { type RouterOutputs } from "~/trpc/shared";
import { Icons } from "../components/ui/Icons";
import { Button } from "../components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../components/ui/form";
import { Input } from "../components/ui/input";
import { ScrollArea } from "../components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { toast } from "../components/ui/use-toast";
import { HexColorPicker } from "react-colorful";
import "./color-picker.css"
import { Card, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { cn } from "~/lib/utils";

interface AddTagsFormProps {
  initialTags: RouterOutputs["tags"]["getAll"];
  userPermissions: RouterOutputs["users"]["getAllPermissions"];
}

const AddTagsForm: FC<AddTagsFormProps> = ({
  initialTags,
  userPermissions,
}) => {
  enum ActionStatus {
    ADD = "ADD",
    EDIT = "EDIT"
  }
  const [tagToEdit, setTagToEdit] = useState<string | undefined>(undefined)
  const [actionStatus, setActionStatus] = useState<ActionStatus>(ActionStatus.ADD)

  const { data: tags, isSuccess } = api.tags.getFiltered.useQuery(undefined, {
    initialData: initialTags,
  });

  const FormSchema = z
    .object({
      name: z.string(),
      parent: z.string().optional(),
      color: z.string().optional()
    });

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
  });

  const { handleSubmit, control, setValue, watch, reset } = form;

  const watchTagName = watch("name")
  const watchTagColor = watch("color")

  const utils = api.useContext();

  const { mutateAsync: removeTag } = api.tags.removeOne.useMutation({
    async onMutate(newOperation) {
      toast({
        title: `Tag ${newOperation.name} eliminado`,
        variant: "success",
      });

      // Doing the Optimistic update
      await utils.tags.getAll.cancel();

      const prevData = utils.tags.getAll.getData();

      utils.tags.getAll.setData(
        undefined,
        (old) => old?.filter((tag) => tag.name !== newOperation.name),
      );

      return { prevData };
    },
    onError(err, newOperation, ctx) {
      utils.tags.getAll.setData(undefined, ctx?.prevData);

      // Doing some ui actions
      toast({
        title: "No se pudo eliminar el tag",
        description: `${JSON.stringify(err.message)}`,
        variant: "destructive",
      });
    },
    onSettled() {
      void utils.tags.getAll.invalidate();
    },
  });

  const { mutateAsync } = api.tags.addOne.useMutation({
    async onMutate(newOperation) {
      toast({
        title: `Tag ${newOperation.name} añadido`,
        variant: "success",
      });

      // Doing the Optimistic update
      await utils.tags.getFiltered.cancel();

      const prevData = utils.tags.getFiltered.getData();

      utils.tags.getFiltered.setData(undefined, (old) => [
        // @ts-ignore
        ...old,
        newOperation,
      ]);

      reset()

      return { prevData };
    },
    onError(err, newOperation, ctx) {
      utils.tags.getFiltered.setData(undefined, ctx?.prevData);

      // Doing some ui actions
      toast({
        title: "No se pudo añadir el tag",
        description: `${JSON.stringify(err.message)}`,
        variant: "destructive",
      });
    },
    onSettled() {
      void utils.tags.getFiltered.invalidate();
    },
  });

  const { mutateAsync: editAsync } = api.tags.editOne.useMutation({
    async onMutate(newOperation) {
      toast({
        title: `Tag ${newOperation.name} editado`,
        variant: "success",
      });

      // Doing the Optimistic update
      await utils.tags.getFiltered.cancel();

      const prevData = utils.tags.getFiltered.getData();

      utils.tags.getAll.setData(undefined, (old) => old!.map(tag => {
        if (tag.name === newOperation.oldName) {
          return ({ name: newOperation.name ?? newOperation.oldName, parent: newOperation.parent ?? null, color: newOperation.color ?? null, children: tag.children })
        } else {
          return tag
        }
      }));

      reset()

      return { prevData };
    },
    onError(err, newOperation, ctx) {
      utils.tags.getFiltered.setData(undefined, ctx?.prevData);

      // Doing some ui actions
      toast({
        title: "No se pudo editar el tag",
        description: `${JSON.stringify(err.message)}`,
        variant: "destructive",
      });
    },
    onSettled() {
      void utils.tags.getFiltered.invalidate();
    },
  });



  async function onSubmit(data: z.infer<typeof FormSchema>) {
    if (actionStatus === ActionStatus.ADD) {
      await mutateAsync({ name: data.name, parent: data.parent, color: data.color });
    } else if (actionStatus === ActionStatus.EDIT && tagToEdit) {
      await editAsync({ name: data.name, parent: data.parent, color: data.color, oldName: tagToEdit })
    }
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="flex flex-row space-x-2"
          disabled={
            userPermissions?.find(
              (p) =>
                p.name === "ADMIN" ||
                p.name === "ENTITIES_MANAGE" ||
                p.name === "ENTITIES_MANAGE_SOME",
            )
              ? false
              : true
          }
        >
          <p>Añadir tag</p>
          <Icons.tag className="h-4 text-black" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <Form {...form}>
          <form onSubmit={handleSubmit(onSubmit)}>
            <DialogHeader className="flex flex-row items-center justify-between">
              <DialogTitle className={cn(actionStatus === ActionStatus.EDIT && "animate-pulse")}>{actionStatus === ActionStatus.ADD ? "Añadiendo tag" : actionStatus === ActionStatus.EDIT ? "Editando tag" : ""}</DialogTitle>
              {actionStatus === ActionStatus.EDIT && (
                <Button variant="outline" className="animate-pulse" onClick={() => {
                  reset()
                  setActionStatus(ActionStatus.ADD)
                }}>Volver a añadir</Button>
              )}
              <DialogClose asChild>
                <Button type="button" variant="outline">
                  Cerrar
                </Button>
              </DialogClose>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <FormField
                control={control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre</FormLabel>
                    <FormControl>
                      <Input placeholder="" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={control}
                name="parent"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Padre</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Elegir" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {isSuccess &&
                          tags
                            .map((tag) => (
                              <SelectItem key={tag.name} value={tag.name}>
                                {capitalizeFirstLetter(tag.name)}
                              </SelectItem>
                            ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={control}
                name="color"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Color</FormLabel>
                    <FormControl>
                      <div className="flex flex-row gap-8 justify-start items-center h-32">
                        <section className="small">
                          <HexColorPicker color={field.value} onChange={(color) => setValue("color", color)} />
                        </section>
                        <Card className="flex items-start shadow-md justify-center h-32 w-32 border-2" style={{ borderColor: watchTagColor }}>
                          <CardHeader>
                            <CardTitle>Ejemplo</CardTitle>
                            <CardDescription>{watchTagName}</CardDescription>
                          </CardHeader>
                        </Card>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter>
              <Button type="submit" variant="outline">
                {actionStatus === ActionStatus.ADD ? "Añadir" : actionStatus === ActionStatus.EDIT ? "Editar" : ""}
              </Button>
            </DialogFooter>
          </form>
        </Form>
        <ScrollArea className="h-40 w-full">
          <div className="grid grid-cols-1 gap-2 pr-6">
            <h1 className="text-2xl font-semibold">Tags</h1>
            {isSuccess && tags.map((tag, index) => (
              <div
                key={index}
                className="flex flex-row items-center justify-between rounded-xl border-2 p-2"
                style={{ borderColor: tag.color ?? undefined }}
              >
                <div className="flex flex-row space-x-4">
                  <h1>{capitalizeFirstLetter(tag.name)}</h1>
                  {tag.parent && (
                    <p className="text-muted-foreground">
                      {capitalizeFirstLetter(tag.parent)}
                    </p>
                  )}
                </div>
                <div className="flex flex-row gap-2">
                  <Button variant="outline" className="border-transparent" onClick={() => {
                    setActionStatus(ActionStatus.EDIT)
                    setTagToEdit(tag.name)
                    setValue("name", tag.name)
                    setValue("parent", tag.parent ?? undefined)
                    setValue("color", tag.color ?? undefined)
                  }}>
                    <Icons.editing className="w-4 h-4 text-green" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="outline"
                        className="border-transparent"
                      >
                        <Icons.cross className="h-4 text-red" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>
                          ¿Seguro que querés borrar el tag?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          Si el mismo tiene entidades relacionadas, no podrá ser eliminado
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          className="bg-red"
                          onClick={() => removeTag({ name: tag.name })}
                        >
                          Eliminar
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default AddTagsForm;
