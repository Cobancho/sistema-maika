"use client";

import Lottie from "lottie-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { type FC } from "react";
import {
  capitalizeFirstLetter,
  createQueryString,
  getInitials,
} from "~/lib/functions";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";
import { type RouterOutputs } from "~/trpc/shared";
import loadingJson from "../../../public/animations/loading.json";
import { Icons } from "../components/ui/Icons";
import { Avatar, AvatarFallback } from "../components/ui/avatar";
import { Button } from "../components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "../components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../components/ui/popover";

interface EntitySwitcherProps {
  initialEntities: RouterOutputs["entities"]["getAll"];
}

const EntitySwitcher: FC<EntitySwitcherProps> = ({ initialEntities }) => {
  const { data: entities, isLoading } = api.entities.getAll.useQuery(
    undefined,
    { initialData: initialEntities },
  );

  const groupedEntities = entities.reduce(
    (acc, entity) => {
      const existingGroup = acc.find((group) => group.tag === entity.tag);

      if (existingGroup) {
        existingGroup.entities.push({ id: entity.id, name: entity.name });
      } else {
        acc.push({
          tag: entity.tag,
          entities: [{ id: entity.id, name: entity.name }],
        });
      }

      return acc;
    },
    [] as { tag: string; entities: { id: number; name: string }[] }[],
  );

  const tags = Array.from(new Set(groupedEntities.map((group) => group.tag)));

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const selectedTag = searchParams.get("tag");
  const selectedEntity = searchParams.get("entidad");
  const parsedEntity = selectedEntity ? parseInt(selectedEntity) : null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          className="w-[200px] justify-between"
        >
          {isLoading ? (
            <Lottie animationData={loadingJson} className="h-5" loop={true} />
          ) : (
            <>
              <Avatar className="mr-2 h-7 w-7">
                <AvatarFallback>
                  {selectedTag
                    ? getInitials(selectedTag).toUpperCase()
                    : selectedEntity
                    ? (() => {
                        const foundEntity = entities.find(
                          (entity) => entity.id === parsedEntity,
                        );
                        return foundEntity ? getInitials(foundEntity.name) : "";
                      })()
                    : ""}
                </AvatarFallback>
              </Avatar>
              <p>
                {" "}
                {selectedTag
                  ? capitalizeFirstLetter(selectedTag)
                  : selectedEntity
                  ? entities.find((entity) => entity.id === parsedEntity)?.name
                  : "Elegir"}{" "}
              </p>
              <Icons.caretSort className="ml-auto h-4 w-4 shrink-0 opacity-50" />
            </>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent>
        <Command>
          <CommandList>
            <CommandInput placeholder="Buscar entidad..." />
            <CommandEmpty>No se encontraron entidades.</CommandEmpty>
            <CommandGroup heading="Tags">
              {tags.map((tag) => (
                <CommandItem
                  key={tag}
                  className="text-sm"
                  onSelect={() =>
                    router.push(
                      pathname +
                        "?" +
                        createQueryString(searchParams, "tag", tag, "entidad"),
                    )
                  }
                >
                  {capitalizeFirstLetter(tag)}
                  <Icons.check
                    className={cn(
                      "ml-auto h-4 w-4",
                      selectedTag === tag ? "opacity-100" : "opacity-0",
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
            {groupedEntities.map((group) => (
              <CommandGroup
                key={group.tag}
                heading={capitalizeFirstLetter(group.tag)}
              >
                {group.entities.map((entity) => (
                  <CommandItem
                    key={entity.id}
                    className="text-sm"
                    onSelect={() => {
                      router.push(
                        pathname +
                          "?" +
                          createQueryString(
                            searchParams,
                            "entidad",
                            entity.id.toString(),
                            "tag",
                          ),
                      );
                    }}
                  >
                    <Avatar className="mr-2">
                      <AvatarFallback>
                        {getInitials(entity.name)}
                      </AvatarFallback>
                    </Avatar>
                    {entity.name}
                    <Icons.check
                      className={cn(
                        "ml-auto h-4 w-4",
                        parsedEntity === entity.id
                          ? "opacity-100"
                          : "opacity-0",
                      )}
                    />
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

export default EntitySwitcher;