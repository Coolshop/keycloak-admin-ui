import React, { useState } from "react";
import { Controller, useFormContext } from "react-hook-form";
import { useTranslation } from "react-i18next";
import {
  Divider,
  FormGroup,
  Select,
  SelectGroup,
  SelectOption,
  SelectVariant,
  Split,
  SplitItem,
} from "@patternfly/react-core";

import type ClientRepresentation from "@keycloak/keycloak-admin-client/lib/defs/clientRepresentation";
import type RoleRepresentation from "@keycloak/keycloak-admin-client/lib/defs/roleRepresentation";
import { useAdminClient, useFetch } from "../../../context/auth/AdminClient";
import { useRealm } from "../../../context/realm-context/RealmContext";
import { HelpItem } from "../../../components/help-enabler/HelpItem";
import type { ComponentProps } from "./components";

export const RoleComponent = ({ name, label, helpText }: ComponentProps) => {
  const { t } = useTranslation("client-scopes");

  const adminClient = useAdminClient();
  const { realm } = useRealm();
  const { control, errors } = useFormContext();

  const [roleOpen, setRoleOpen] = useState(false);
  const [clientsOpen, setClientsOpen] = useState(false);
  const [clients, setClients] = useState<ClientRepresentation[]>();
  const [selectedClient, setSelectedClient] = useState<ClientRepresentation>();
  const [clientRoles, setClientRoles] = useState<RoleRepresentation[]>([]);
  const [selectedRole, setSelectedRole] = useState<RoleRepresentation>();

  const fieldName = `config.${name?.replaceAll(".", "-")}`;

  useFetch(
    async () => {
      const clients = await adminClient.clients.find();

      const asyncFilter = async (
        predicate: (client: ClientRepresentation) => Promise<boolean>
      ) => {
        const results = await Promise.all(clients.map(predicate));
        return clients.filter((_, index) => results[index]);
      };

      const filteredClients = await asyncFilter(
        async (client) =>
          (await adminClient.clients.listRoles({ id: client.id! })).length > 0
      );

      filteredClients.map(
        (client) =>
          (client.toString = function () {
            return this.clientId!;
          })
      );
      return filteredClients;
    },
    (filteredClients) => setClients(filteredClients),
    []
  );

  const createSelectGroup = (clients: ClientRepresentation[]) => {
    return [
      <SelectGroup key="role" label={t("roleGroup")}>
        <SelectOption
          key="realmRoles"
          value={
            {
              name: "realmRoles",
              toString: () => t("realmRoles"),
            } as ClientRepresentation
          }
        >
          {realm}
        </SelectOption>
      </SelectGroup>,
      <Divider key="divider" />,
      <SelectGroup key="group" label={t("clientGroup")}>
        {clients.map((client) => (
          <SelectOption key={client.id} value={client}>
            {client.clientId}
          </SelectOption>
        ))}
      </SelectGroup>,
    ];
  };

  const roleSelectOptions = () => {
    const createItem = (role: RoleRepresentation) => (
      <SelectOption key={role.id} value={role}>
        {role.name}
      </SelectOption>
    );
    return clientRoles.map((role) => createItem(role));
  };

  useFetch(
    async () => {
      if (selectedClient && selectedClient.name !== "realmRoles") {
        const clientRoles = await adminClient.clients.listRoles({
          id: selectedClient.id!,
        });
        return clientRoles;
      } else {
        return await adminClient.roles.find();
      }
    },
    (clientRoles) => setClientRoles(clientRoles),
    [selectedClient]
  );

  const onClear = (onChange: (value: string) => void) => {
    setSelectedClient(undefined);
    setSelectedRole(undefined);
    onChange("");
  };

  return (
    <FormGroup
      label={label!}
      labelIcon={
        <HelpItem helpText={t(helpText!)} forLabel={name!} forID={name!} />
      }
      validated={errors[fieldName] ? "error" : "default"}
      helperTextInvalid={t("common:required")}
      fieldId={name!}
    >
      <Controller
        name={fieldName}
        defaultValue=""
        control={control}
        rules={{ required: true }}
        render={({ onChange, value }) => {
          const [client, role] = value?.split(".") || ["", ""];
          return (
            <Split hasGutter>
              <SplitItem>
                {clients && (
                  <Select
                    toggleId={name!}
                    onToggle={() => setClientsOpen(!clientsOpen)}
                    isOpen={clientsOpen}
                    variant={SelectVariant.typeahead}
                    typeAheadAriaLabel={t("selectASourceOfRoles")}
                    placeholderText={t("selectASourceOfRoles")}
                    isGrouped
                    onFilter={(evt) => {
                      const textInput = evt?.target.value || "";
                      if (textInput === "") {
                        return createSelectGroup(clients);
                      } else {
                        return createSelectGroup(
                          clients.filter((client) =>
                            client
                              .name!.toLowerCase()
                              .includes(textInput.toLowerCase())
                          )
                        );
                      }
                    }}
                    selections={selectedClient || client}
                    onClear={() => onClear(onChange)}
                    onSelect={(_, value) => {
                      setSelectedClient(value as ClientRepresentation);
                      setClientsOpen(false);
                    }}
                  >
                    {createSelectGroup(clients)}
                  </Select>
                )}
              </SplitItem>
              <SplitItem>
                <Select
                  onToggle={(isExpanded) => setRoleOpen(isExpanded)}
                  isOpen={roleOpen}
                  variant={SelectVariant.typeahead}
                  placeholderText={
                    selectedClient?.name !== "realmRoles"
                      ? t("clientRoles")
                      : t("selectARole")
                  }
                  isDisabled={!selectedClient && !role}
                  typeAheadAriaLabel={t("selectARole")}
                  selections={selectedRole?.name || role}
                  onSelect={(_, value) => {
                    const role = value as RoleRepresentation;
                    setSelectedRole(role);
                    onChange(`${selectedClient?.clientId}.${role.name}`);
                    setRoleOpen(false);
                  }}
                  maxHeight={200}
                  onClear={() => onClear(onChange)}
                >
                  {roleSelectOptions()}
                </Select>
              </SplitItem>
            </Split>
          );
        }}
      />
    </FormGroup>
  );
};
